// ...existing code...
const express = require("express");
const crypto = require("crypto");
const logger = require("../config/logger");
const { sendEvent } = require("../sse/sseManager");

const router = express.Router();
const API_KEY = process.env.API_KEY;

// small JSON limit to avoid large payloads
const jsonParser = express.json({ limit: "64kb" });

// simple helpers
function isIsoTimestamp(s) {
  if (!s) return false;
  const t = Date.parse(s);
  return !Number.isNaN(t);
}
function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

router.post("/", jsonParser, (req, res) => {
  if (!API_KEY) {
    logger.error("webhook-alert: API_KEY not configured");
    return res.status(500).json({ error: "server_misconfigured" });
  }

  const key = String(req.headers["x-api-key"] || "");
  try {
    const a = Buffer.from(API_KEY, "utf8");
    const b = Buffer.from(key, "utf8");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(401).json({ error: "unauthorized" });
    }
  } catch (e) {
    return res.status(401).json({ error: "unauthorized" });
  }

  // Basic payload validation by alert type
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const type = String(body.type || "").trim();

  if (!type) {
    return res
      .status(400)
      .json({ error: "invalid_payload", reason: "missing type" });
  }
  // validate for known types
  let alert = null;

  if (type === "missing_data") {
    // expected fields:
    // { type: "missing_data", source: "polar" or "zebra", player_id, timestamp}
    const player_id = body.player_id;
    const timestamp = body.timestamp;
    const source = String(body.source || "").toLowerCase();
    if (!isNonEmptyString(String(player_id))) {
      return res
        .status(400)
        .json({ error: "invalid_payload", reason: "player_id required" });
    }
    if (source !== "polar" && source !== "zebra") {
      return res
        .status(400)
        .json({
          error: "invalid_payload",
          reason: "source must be 'polar' or 'zebra'",
        });
    }
    alert = {
      type: "missing_data",
      source: String(body.source || "unknown"),
      player_id,
      timestamp,
      received_at: new Date().toISOString(),
    };
  } else if (type === "delayed_data") {
    // expected fields:
    // { type: "delayed_data", source: "polar", player_id, delay_seconds, last_update, timestamp }
    const player_id = body.player_id;
    const delay_seconds = Number(body.delay_seconds);
    const last_update = body.last_update;
    const timestamp = body.timestamp;

    if (!isNonEmptyString(String(player_id))) {
      return res
        .status(400)
        .json({ error: "invalid_payload", reason: "player_id required" });
    }

    alert = {
      type: "delayed_data",
      source: String(body.source || "unknown"),
      player_id,
      delay_seconds: Math.round(delay_seconds),
      last_update,
      timestamp,
      received_at: new Date().toISOString(),
    };
  } else {
    return res
      .status(400)
      .json({ error: "invalid_payload", reason: `unsupported type: ${type}` });
  }

  logger.info(
    { type: alert.type, player_id: alert.player_id ,source: alert.source},
    "webhook-alert: received"
  );

  try {
    // broadcast to SSE subscribers as event "alert"
    sendEvent(alert, "alert");
    return res.sendStatus(200);
  } catch (err) {
    logger.error(
      { err: err && err.message },
      "webhook-alert: sendEvent failed"
    );
    return res.status(500).json({ error: "processing_failed" });
  }
});

module.exports = router;
