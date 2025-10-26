const { FatigueSchema } = require("../utils/validators");
const { coercePlayerId } = require("../utils/helpers");
const { sendEvent } = require("../sse/sseManager");
const logger = require("../config/logger");

async function postFatigue(req, res) {
  logger.debug("POST /push called");

  const parsed = FatigueSchema.safeParse(req.body || {});
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

  // Interpret provider value safely: coerce and require it to be a finite
  // number between 1 and 5. If it's not (missing, null, non-numeric, or
  // out-of-range) we will suppress the broadcast and return 204 to indicate
  // the request was accepted but nothing was emitted.
  const rawProvided = fatigue_level;

  if (rawProvided === null || rawProvided === undefined) {
    logger.info(
      { pid: `P${playerNum}` },
      "No fatigue_level provided — suppressing broadcast"
    );
    return res.sendStatus(204);
  }

  const provNum = Number(rawProvided);
  const provided_fatigue_level = Number.isFinite(provNum) ? provNum : null;

  if (provided_fatigue_level === null) {
    logger.warn(
      { pid: `P${playerNum}`, rawProvided },
      "Invalid fatigue_level — suppressing broadcast"
    );
    return res.sendStatus(204);
  }

  if (provided_fatigue_level < 1 || provided_fatigue_level > 5) {
    logger.warn(
      { pid: `P${playerNum}`, provided_fatigue_level },
      "producer sent out-of-range fatigue_level — suppressing broadcast"
    );
    return res.sendStatus(204);
  }

  const level = provided_fatigue_level;

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
  return res.sendStatus(200);
}

module.exports = { postFatigue };
