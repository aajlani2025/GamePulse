const jwt = require("jsonwebtoken");
const pool = require("../config/db");

async function verifyAccessToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.sendStatus(401);
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);

  try {
    // Verify token synchronously (throws on invalid/expired)
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const id = decoded?.sub;
    const username = decoded?.username;
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
      console.error("DB error in auth middleware:", dbErr);
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
