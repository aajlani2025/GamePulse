const express = require("express");
const { PushSchema } = require("../utils/validators");
const { coercePlayerId } = require("../utils/helpers");
const { sendEvent } = require("../sse/sseManager");
const logger = require("../config/logger");

const router = express.Router();

router.post("/", (req, res) => {
  logger.debug("POST /push called");

  const parsed = PushSchema.safeParse(req.body || {});
  if (!parsed.success) {
    logger.warn({ issues: parsed.error.format() }, "Validation failed");
    return res.status(400).json({ error: "invalid_payload" });
  }

  const { player_id, timestamp, fatigue_level } = parsed.data;
  let playerNum;
  try {
    playerNum = coercePlayerId(player_id);
  } catch (e) {
    return res.status(400).json({ error: "Invalid player_id" });
  }

  if (playerNum < 1 || playerNum > 40) {
    return res.status(400).json({ error: "player_id must be 1..40" });
  }

  // Interpret provider value safely: coerce, validate range 1..5, otherwise fall back
  const rawProvided = fatigue_level;
  const provNum = rawProvided != null ? Number(rawProvided) : NaN;
  const provided_fatigue_level = Number.isFinite(provNum) ? provNum : null;

  let level;
  if (
    provided_fatigue_level !== null &&
    provided_fatigue_level >= 1 &&
    provided_fatigue_level <= 5
  ) {
    level = provided_fatigue_level;
  } else {
    // Producer did not supply a valid 1..5 value. Use server default (1).
    level = 1;
    if (provided_fatigue_level !== null) {
      // Numeric but out of expected range — log for diagnostics
      logger.warn(
        { pid: `P${playerNum}`, provided_fatigue_level },
        "producer sent out-of-range fatigue_level, using default"
      );
    }
  }

  const payload = {
    pid: `P${playerNum}`,
    level, // authoritative level used by UI
    metrics: {
      timestamp: timestamp ?? null,
      // keep the provider original numeric interpretation (or null)
      provided_fatigue_level: provided_fatigue_level,
    },
    ts: Date.now(),
  };

  logger.info({ payload }, "Broadcasting player update");
  sendEvent(payload);
  res.sendStatus(200);
});

module.exports = router;
