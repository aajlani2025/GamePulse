const express = require("express");
const { PushSchema } = require("../utils/validators");
const { coercePlayerId, to01 } = require("../utils/helpers");
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

  const { player_id, fatigue_level, ...rest } = parsed.data;
  let playerNum;
  try {
    playerNum = coercePlayerId(player_id);
  } catch (e) {
    return res.status(400).json({ error: "Invalid player_id" });
  }

  if (playerNum < 1 || playerNum > 40) {
    return res.status(400).json({ error: "player_id must be 1..40" });
  }

  const level = Number.isFinite(fatigue_level) ? fatigue_level : 1;

  const payload = {
    pid: `P${playerNum}`,
    level,
    metrics: { ...rest, provided_fatigue_level: fatigue_level ?? null },
    ts: Date.now(),
  };

  logger.info({ payload }, "Broadcasting player update");
  sendEvent(payload);
  res.sendStatus(200);
});

module.exports = router;
