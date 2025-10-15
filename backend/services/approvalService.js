const pool = require("../config/db");
const approvalsRepo = require("../repositories/approvalsRepository");

async function createApprovalForUser(userId, consent = true) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await approvalsRepo.insertApproval(
      client,
      userId,
      consent
    );

    await client.query("COMMIT");
    return inserted;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function hasUserApproved(userId) {
  const row = await approvalsRepo.getLatestApprovalByUser(userId);
  return Boolean(row && row.consent_given);
}
async function revokeUserApproval (userId) {  
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const updated = await approvalsRepo.setApprovalFalse(
      client,
      userId
    );
    await client.query("COMMIT");
    return updated;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { createApprovalForUser, hasUserApproved , revokeUserApproval };
