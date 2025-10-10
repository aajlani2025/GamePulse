// server-sse.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const pino = require("pino");
const pinoHttp = require("pino-http");
const { z } = require("zod");
const fs = require("fs");

// Ensure logs directory exists
if (!fs.existsSync("./logs")) {
  fs.mkdirSync("./logs", { recursive: true });
}

// CORRECTED pino logger configuration
const logger = pino(
  {
    level: process.env.LOG_LEVEL || "info",
  },
  pino.destination("./logs/server.log")
);

const app = express();

// pino-http for HTTP request logging
app.use(
  pinoHttp({
    logger,
    customLogLevel: function (req, res, err) {
      if (res.statusCode >= 400 && res.statusCode < 500) return "warn";
      if (res.statusCode >= 500 || err) return "error";
      return "info";
    },
    customSuccessMessage: function (req, res) {
      if (res.statusCode === 404) return "resource not found";
      return `${req.method} ${req.url} completed`;
    },
  })
);

// Basic security headers
app.use(helmet());

// Limit request body size to avoid large payloads
app.use(express.json({ limit: "8kb" }));

// CORS - restrict origins via env or default to localhost:3000 (client)
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : ["http://localhost:3000"];
app.use(
  cors({
    origin: (origin, callback) => {
      // allow non-browser requests like curl/postman (no origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
      callback(new Error("CORS not allowed"));
    },
    optionsSuccessStatus: 200,
  })
);

/** ---- SSE plumbing ---- */
const clients = new Set();
function sendEvent(payload, eventName = "player_update") {
  const line = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) {
    try {
      res.write(line);
    } catch (err) {
      // If a write fails, remove the client and log
      clients.delete(res);
      logger.warn({ err }, "Failed to write SSE to client, removing");
    }
  }
}

app.get("/events", (req, res) => {
  logger.info({ client: req.ip }, "New SSE client connected");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  clients.add(res);

  // heartbeat (prevents proxies from closing idle connections)
  const hb = setInterval(() => res.write(`: keep-alive\n\n`), 25000);

  req.on("close", () => {
    clearInterval(hb);
    clients.delete(res);
    logger.info({ client: req.ip }, "SSE client disconnected");
  });
});

// Accept 1, "1", "P1", "p1" → 1; throw on invalid
function coercePlayerId(val) {
  if (typeof val === "number" && Number.isFinite(val)) return Math.trunc(val);
  if (typeof val === "string") {
    const s = val.trim();
    const m = /^p?(\d+)$/i.exec(s); // matches "12" or "P12"
    if (m) return Math.trunc(Number(m[1]));
  }
  throw new Error("Invalid player_id");
}

// Convert booleans to 0 or 1
function to01(v) {
  const s = String(v).toLowerCase();
  if (v === 1 || s === "1" || s === "yes" || s === "true") return 1;
  if (v === 0 || s === "0" || s === "no" || s === "false") return 0;
  return null;
}

// Placeholder fatigue computation if none provided (will later be replaced with a stronger logic)
function computeFatigueFallback({ hr, hrv, respiration, sprint, cod, impact }) {
  let score = 0;
  const nhr = Number(hr);
  const nhrv = Number(hrv);
  const nresp = Number(respiration);

  if (Number.isFinite(nhr) && nhr > 160) score += 1;
  if (Number.isFinite(nhrv) && nhrv < 35) score += 1;
  if (Number.isFinite(nresp) && nresp > 22) score += 1;
  if (to01(sprint) === 1) score += 1;
  if (to01(cod) === 1) score += 1;
  if (to01(impact) === 1) score += 1;

  if (score <= 1) return 1; // Full energy
  if (score <= 2) return 2; // Light fatigue
  if (score <= 4) return 3; // Tired
  return 4; // Overload
}

// Rate limiter for write endpoints (exclude SSE). Tune window & limits as needed.
const pushLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 120, // limit each IP to 120 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({ ip: req.ip }, "Rate limit exceeded");
    return res.status(429).json({ error: "Too many requests" });
  },
});

// Zod schema for /push payloads 
const PushSchema = z.object({
  player_id: z.union([z.number(), z.string()]),
  timestamp: z.optional(z.union([z.string(), z.number()])),
  hr: z.optional(z.number()),
  hrv: z.optional(z.number()),
  respiration: z.optional(z.number()),
  pos_x: z.optional(z.number()),
  pos_y: z.optional(z.number()),
  cod: z.optional(z.any()),
  sprint: z.optional(z.any()),
  distanceHI: z.optional(z.number()),
  impact: z.optional(z.any()),
  fatigue_level: z.optional(z.number()),
  rr: z.optional(z.number()),
});

app.post("/push", pushLimiter, (req, res) => {
  // Use pino instead of console.log for debug
  logger.debug("POST /push called");
  logger.debug({ contentType: req.headers["content-type"] }, "Request headers");

  const raw = req.body || {};
  logger.info({ raw }, "POST /push received");

  const parsed = PushSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.format();
    logger.warn({ issues, raw }, "Validation failed");
    return res.status(400).json({ error: "invalid_payload", details: issues });
  }

  const {
    player_id,
    timestamp,
    hr,
    hrv,
    respiration,
    pos_x,
    pos_y,
    cod,
    sprint,
    distanceHI,
    impact,
    fatigue_level,
    rr,
  } = parsed.data;

  // Validate player id → number 1..40
  let playerNum;
  try {
    playerNum = coercePlayerId(player_id);
  } catch (e) {
    logger.warn({ player_id, error: e.message }, "Invalid player_id");
    return res
      .status(400)
      .json({ error: "player_id must be 1..40 or 'P1'..'P40'" });
  }
  if (!Number.isInteger(playerNum) || playerNum < 1 || playerNum > 40) {
    logger.warn({ player_id, playerNum }, "Out of range player_id");
    return res
      .status(400)
      .json({ error: "player_id must be 1..40 or 'P1'..'P40'" });
  }

  // Prefer provided fatigue_level if valid else compute fallback
  let providedLevel = Number(fatigue_level ?? fatigue_level);
  if (
    !Number.isFinite(providedLevel) ||
    providedLevel < 1 ||
    providedLevel > 5
  ) {
    providedLevel = undefined;
  }
  // if level not provided or invalid put it to one (will later be changed when the fallback is correctly coded)
  const level = providedLevel ?? 1;

  logger.info(
    { pid: playerNum, level, providedLevel },
    "Computed fatigue level"
  );

  const payload = {
    pid: `P${playerNum}`,
    level, // final level used by the UI
    metrics: {
      timestamp: timestamp ?? null,
      hr: Number.isFinite(Number(hr)) ? Number(hr) : null,
      hrv: Number.isFinite(Number(hrv)) ? Number(hrv) : null,
      respiration: Number.isFinite(Number(respiration))
        ? Number(respiration)
        : null,
      rr: Number.isFinite(Number(rr)) ? Number(rr) : null,
      pos_x: Number.isFinite(Number(pos_x)) ? Number(pos_x) : null,
      pos_y: Number.isFinite(Number(pos_y)) ? Number(pos_y) : null,
      cod: to01(cod),
      sprint: to01(sprint),
      distanceHI: Number.isFinite(Number(distanceHI))
        ? Number(distanceHI)
        : null,
      impact: to01(impact),
      provided_fatigue_level: providedLevel ?? null, // keep what came in for auditing
    },
    ts: Date.now(),
  };

  logger.info(
    { payload, clientCount: clients.size },
    "Broadcasting player update"
  );
  sendEvent(payload); // broadcasts as "player_update"
  return res.sendStatus(200);
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error({ err, url: req.url, method: req.method }, "Unhandled error");
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "internal_server_error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  logger.info(`SSE server running on http://localhost:${PORT}`)
);
