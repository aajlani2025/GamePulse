const pool = require("../config/db");

async function findByNormalizedUsername(normUsername) {
  const sql = `SELECT id, username, password_hash FROM users WHERE LOWER(TRIM(username)) = $1`;
  const { rows } = await pool.query(sql, [normUsername]);
  return rows || [];
}

async function updateRefreshHashById(id, refreshHash) {
  const sql = `UPDATE users SET refrash_token_hash = $2, last_login_at = NOW() WHERE id = $1`;
  await pool.query(sql, [id, refreshHash]);
}

async function updateRefreshHashByUsername(username, refreshHash) {
  const sql = `UPDATE users SET refrash_token_hash = $2 WHERE username = $1 RETURNING id`;
  const { rows } = await pool.query(sql, [username, refreshHash]);
  return rows[0];
}
async function findByUsername(username) {
  const sql = `SELECT id, username, refrash_token_hash FROM users WHERE username = $1 LIMIT 1`;
  const { rows } = await pool.query(sql, [username]);
  return rows[0];
}

module.exports = {
  findByNormalizedUsername,
  updateRefreshHashById,
  updateRefreshHashByUsername,
  findByUsername,
};
