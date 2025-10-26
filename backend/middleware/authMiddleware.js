const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const logger = require("../config/logger");

async function verifyAccessToken(req, res, next) {
  // Accept token from Authorization header, query param, or cookie.
  // As a last resort (for browser EventSource which can't set headers) accept
  // the refreshToken cookie and verify it with REFRESH_TOKEN_SECRET as a
  // fallback authentication mechanism.
  const authHeader = req.headers["authorization"];
  let token = authHeader ? authHeader.split(" ")[1] : null;
  // query param (e.g. /events?access_token=...)
  if (!token && req.query && req.query.access_token)
    token = req.query.access_token;
  // cookie (non-HttpOnly access token, rare) or refresh cookie fallback
  let tokenIsRefresh = false;
  if (!token && req.cookies && req.cookies.accessToken)
    token = req.cookies.accessToken;
  if (!token && req.cookies && req.cookies.refreshToken) {
    token = req.cookies.refreshToken;
    tokenIsRefresh = true;
  }

  if (!token) return res.sendStatus(401);

  try {
    // Verify token synchronously (throws on invalid/expired)
    const secret = tokenIsRefresh
      ? process.env.REFRESH_TOKEN_SECRET
      : process.env.ACCESS_TOKEN_SECRET;
    const decoded = jwt.verify(token, secret);
    const id = decoded?.sub;
    if (!id) return res.status(403).json({ error: "invalid_token" });

    // Confirm the user exists in the DB (no JSON file dependency)
    try {
      const { rows } = await pool.query(
        `SELECT id, username FROM users WHERE id = $1 LIMIT 1`,
        [id]
      );
      const user = rows[0];
      if (!user) return res.sendStatus(401);

      // attach a lightweight user object to the request for downstream handlers
      req.user = { id: user.id, username: user.username };
      return next();
    } catch (dbErr) {
      logger.error({ err: dbErr }, "DB error in auth middleware");
      return res.sendStatus(500);
    }
  } catch (err) {
    if (err && err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "access_token_expired" });
    }
    return res.status(403).json({ error: "invalid_token" });
  }
}

module.exports = verifyAccessToken;
