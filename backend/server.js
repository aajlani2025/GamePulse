// backend/server.js
import express from "express";
import cors from "cors";
import http from "http";
import { WebSocketServer } from "ws";
import { createClient as createRedisClient } from "redis";
import pg from "pg";
import crypto from "crypto";
import { handleSensorMessage } from "./realtimeBuffer.js";

const { Pool } = pg;

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8000;
const DATABASE_URL = process.env.DATABASE_URL; // postgres://user:pass@host:18322/db?sslmode=require
const REDIS_URL = process.env.REDIS_URL;       // redis://user:pass@host:port

// --------------------
// Postgres Pool (reuse, do not recreate per request)
// --------------------
const pgPool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // managed DB (OVH, Aiven, etc.)
    })
  : null;

// Safe write-behind (never throws)
async function persistFatigueEvent(record) {
  if (!pgPool) return;

  try {
    await pgPool.query(
      `
      INSERT INTO fatigue_events
        (request_id, player_id, sample_ts, fatigue_level, recommendation,
         confidence, model_version, received_at, payload)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (request_id) DO NOTHING
      `,
      [
        record.requestId,
        record.playerId,
        record.sampleTs,
        record.fatigue_level,
        record.recommendation,
        record.confidence ?? null,
        record.modelVersion ?? null,
        record.receivedAt,
        JSON.stringify(record),
      ]
    );
  } catch (e) {
    console.error("[pg write-behind] failed:", e?.message);
    // IMPORTANT: no throw — Redis pipeline must not be impacted
  }
}

// --------------------
// Valkey/Redis client (source of truth for now)
// --------------------
const redis = REDIS_URL ? createRedisClient({ url: REDIS_URL }) : null;

if (redis) {
  redis.on("error", (e) => console.error("Redis error:", e));
  redis
    .connect()
    .then(() => console.log("Redis connected"))
    .catch((e) => console.error("Redis connect failed:", e));
}

// --------------------
// Helpers
// --------------------
function computeRecommendation(fatigue_level) {
  // align with your v1 logic (you can adapt)
  return fatigue_level <= 1 ? "Play" : fatigue_level === 2 ? "Rest" : "Substitute";
}

async function writeRedisLatestAndEvent(record) {
  if (!redis) return;

  const playerId = record.playerId;
  const latestKey = `player:${playerId}:fatigue:latest`;
  const streamKey = `player:${playerId}:fatigue:events`;

  const multi = redis.multi();

  // Latest state (source of truth)
  multi.set(latestKey, JSON.stringify(record));
  // Optional TTL: keep latest 24h
  // multi.expire(latestKey, 60 * 60 * 24);

  // Event log (stream)
  multi.xAdd(streamKey, "*", {
    requestId: record.requestId,
    sampleTs: String(record.sampleTs),
    fatigue_level: String(record.fatigue_level),
    recommendation: record.recommendation,
    confidence: String(record.confidence ?? ""),
    modelVersion: record.modelVersion ?? "",
    receivedAt: record.receivedAt,
  });
  // Optional TTL: keep events 7 days
  // multi.expire(streamKey, 60 * 60 * 24 * 7);

  await multi.exec();
}

// --------------------
// Routes
// --------------------

// /health: probes
app.get("/health", (_, res) => res.json({ status: "ok" }));

// /api/hello: test rapide
app.get("/api/hello", (_, res) => res.json({ message: "Hello from GamePulse API" }));

// /api/ping-db: ping Postgres OVH
app.get("/api/ping-db", async (_, res) => {
  if (!pgPool) return res.status(200).json({ db: "skipped (no DATABASE_URL)" });

  try {
    const r = await pgPool.query("SELECT NOW() as now");
    res.json({ db: "ok", now: r.rows[0].now });
  } catch (e) {
    res.status(500).json({ db: "error", error: String(e?.message || e) });
  }
});

// /api/ping-redis: ping Valkey OVH
app.get("/api/ping-redis", async (_, res) => {
  if (!redis) return res.status(200).json({ redis: "skipped (no REDIS_URL)" });

  try {
    const key = "gp:ping";
    await redis.set(key, "ok", { EX: 30 });
    const v = await redis.get(key);
    res.json({ redis: "ok", value: v });
  } catch (e) {
    res.status(500).json({ redis: "error", error: String(e?.message || e) });
  }
});

// 🚀 ENDPOINT D’INGESTION MOVESENSE (HTTP, depuis n8n ou autre)
app.post("/api/v1/ingestion/movesense", (req, res) => {
  const payload = req.body;

  console.log("📥 Movesense payload received:");
  console.log(JSON.stringify(payload, null, 2));

  return res.status(200).json({
    status: "ok",
    message: "Movesense data ingested",
    received: {
      player_id: payload.player_id,
      session_id: payload.session_id,
      source: payload.source,
      context: payload.context,
      hr_length: Array.isArray(payload.hr) ? payload.hr.length : 0,
      imu_length: Array.isArray(payload.imu) ? payload.imu.length : 0,
    },
  });
});

// 🚀 ENDPOINT PREDICT FATIGUE (Redis-first + Postgres write-behind)
app.post("/predict/fatigue", async (req, res) => {
  try {
    const body = req.body || {};
    const receivedAt = new Date().toISOString();

    const playerId = body.playerId || body.player_id || body.athleteId;
    if (!playerId) {
      return res.status(400).json({
        ok: false,
        error: "Missing playerId (playerId | player_id | athleteId)",
      });
    }

    const requestId =
      body.requestId ||
      req.headers["x-request-id"] ||
      crypto.randomUUID();

    // --- Inference stub (replace later with your real engine v1)
    const fatigue_level = Math.floor(Math.random() * 4); // 0..3 (as your previous stub)
    const recommendation = computeRecommendation(fatigue_level);

    const record = {
      requestId,
      playerId: String(playerId),
      fatigue_level,
      confidence: 0.9,
      recommendation,
      modelVersion: body.modelVersion || "fatigue_engine_stub_v1",
      sampleTs: body.sampleTs || body.timestamp || receivedAt,
      receivedAt,
      source: body.source || "n8n",
    };

    // 1) Redis = source of truth (must succeed for "stable pipeline")
    if (redis) {
      await writeRedisLatestAndEvent(record);
    }

    // 2) Postgres write-behind (best-effort, non-blocking)
    persistFatigueEvent(record).catch(() => {});

    // 3) Respond quickly to n8n
    return res.json({
      ok: true,
      ...record,
      redis_written: !!redis,
      pg_writebehind_enabled: !!pgPool,
    });
  } catch (e) {
    console.error("[/predict/fatigue] error:", e);
    return res.status(500).json({ ok: false, error: "Internal error" });
  }
});

// --------------------
// HTTP + WebSocket server
// --------------------
const server = http.createServer(app);

// serveur WebSocket sur /ws
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const playerId = url.searchParams.get("playerId") || "UNKNOWN";

  console.log("WS CONNECTED → Player:", playerId);

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      handleSensorMessage(playerId, msg);
    } catch (err) {
      console.error("Invalid WS message:", err);
    }
  });

  ws.on("close", () => {
    console.log("WS CLOSED → Player:", playerId);
  });
});

// Graceful shutdown (optional but nice)
async function shutdown() {
  console.log("Shutting down...");
  try {
    if (redis?.isOpen) await redis.quit();
  } catch {}
  try {
    if (pgPool) await pgPool.end();
  } catch {}
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`GamePulse API + WebSocket listening on ${PORT}`);
});
