const pool = require("../config/db");
async function insertApproval(clientOrPool, userId, consent = true) {
  const sql = `INSERT INTO approvals (user_id, consent_given, consent_time) VALUES ($1, $2, NOW()) RETURNING id, user_id, consent_given, consent_time`;
  const params = [userId, consent];

  const isClient = clientOrPool && typeof clientOrPool.release === "function";
  if (isClient) {
    const { rows } = await clientOrPool.query(sql, params);
    return rows[0];
  }

  // fallback to pool
  const { rows } = await pool.query(sql, params);
  return rows[0];
}

module.exports = { insertApproval };

// Get the latest approval row for a given user (most recent consent_time)
async function getLatestApprovalByUser(userId) {
  const sql = `SELECT id, user_id, consent_given, consent_time FROM approvals WHERE user_id = $1 ORDER BY consent_time DESC LIMIT 1`;
  const { rows } = await pool.query(sql, [userId]);
  return rows[0] || null;
}

module.exports = { insertApproval, getLatestApprovalByUser };
