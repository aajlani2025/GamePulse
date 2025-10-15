const { PositionSchema } = require("../utils/validators");
const { coercePlayerId } = require("../utils/helpers");
const { sendEvent } = require("../sse/sseManager");
const logger = require("../config/logger");

async function postPosition(req, res) {
  logger.debug("POST /push_position called");

  const parsed = PositionSchema.safeParse(req.body || {});
  if (!parsed.success) {
    logger.warn(
      { issues: parsed.error.format() },
      "Position validation failed"
    );
    return res.status(400).json({ error: "invalid_payload" });
  }

  const { player_id, timestamp, pos_x, pos_y } = parsed.data;
  let playerNum;
  try {
    playerNum = coercePlayerId(player_id);
  } catch (e) {
    return res.status(400).json({ error: "Invalid player_id" });
  }

  if (playerNum < 1 || playerNum > 40) {
    return res.status(400).json({ error: "player_id must be 1..40" });
  }

  const payload = {
    pid: `P${playerNum}`,
    // For position-only pushes we leave `level` undefined and include metrics
    metrics: {
      timestamp: timestamp ?? null,
      pos_x: Number.isFinite(pos_x) ? pos_x : null,
      pos_y: Number.isFinite(pos_y) ? pos_y : null,
    },
    ts: Date.now(),
  };

  logger.info({ payload }, "Broadcasting position update");
  sendEvent(payload);
  return res.sendStatus(200);
}

module.exports = { postPosition };
