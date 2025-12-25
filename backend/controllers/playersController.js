const { getPlayers } = require("../repositories/playersRepository");
const logger = require("../config/logger");

/**
 * GET /players
 * Retrieves all players for the authenticated user
 */
async function getAllPlayers(req, res) {
  try {
    // id is attached by authMiddleware as req.user.id
    const { id } = req.user;

    if (!id) {
      logger.warn("No user id found in request");
      return res.status(401).json({ error: "Unauthorized" });
    }

    logger.info({ userId: id }, "Fetching players for user");
    const players = await getPlayers(id);

    logger.info(
      { userId: id, playerCount: players.length },
      "Players retrieved successfully"
    );
    return res.status(200).json(players);
  } catch (err) {
    logger.error(
      { err: err?.message, stack: err?.stack, code: err?.code },
      "Error fetching players"
    );
    return res.status(500).json({
      error: "Failed to fetch players",
      details:
        process.env.NODE_ENV === "development" ? err?.message : undefined,
    });
  }
}

module.exports = {
  getAllPlayers,
};
