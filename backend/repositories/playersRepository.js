const pool = require("../config/db");
const logger = require("../config/logger");

async function getPlayers(user_id) {
  try {
    const sql = `SELECT id, jersey_number, position, hr_rest_est, hr_max_est, cardio_level, baseline_recovery_score as recovery_score, created_at FROM players WHERE coach_id = $1 ORDER BY jersey_number ASC`;
    const result = await pool.query(sql, [user_id]);
    logger.info(
      { user_id, rowCount: result.rows.length },
      "Players query executed"
    );
    return result.rows;
  } catch (err) {
    logger.error(
      { err: err?.message, user_id, code: err?.code },
      "Error in getPlayers"
    );
    throw err;
  }
}

module.exports = {
  getPlayers,
};
