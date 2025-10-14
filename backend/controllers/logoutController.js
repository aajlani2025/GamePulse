const jwt = require("jsonwebtoken");
const authService = require("../services/authService");
const logger = require("../config/logger");

// logout: clear the stored refresh token hash for the user (if any), clear cookie
const logout = async (req, res) => {
  const isProd = process.env.NODE_ENV === "production";
  const token = req.cookies?.refreshToken;
  const clearOpts = {
    httpOnly: true,
    sameSite: isProd ? "None" : "Lax",
    secure: isProd,
  };

  // If there's no refresh cookie, treat logout as idempotent success
  if (!token) {
    logger.info(
      { ip: req.ip },
      "No refresh cookie present - logout idempotent"
    );
    res.clearCookie("refreshToken", clearOpts);
    return res.sendStatus(204);
  }

  try {
    // Verify token and extract username
    const payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const username = payload?.username;
    if (!username) {
      // malformed token
      logger.warn({ ip: req.ip }, "Malformed refresh token - missing username");
      res.clearCookie("refreshToken", clearOpts);
      return res.sendStatus(403);
    }

    logger.info(
      { username, ip: req.ip },
      "Clearing stored refresh token for user"
    );

    try {
      await authService.clearRefreshForUsername(username);
      res.clearCookie("refreshToken", clearOpts);
      logger.info(
        { username, ip: req.ip },
        "Successfully cleared refresh token and cookie"
      );
      return res.sendStatus(204);
    } catch (dbErr) {
      logger.error(
        { err: dbErr, username, ip: req.ip },
        "DB error while clearing refresh token"
      );
      res.clearCookie("refreshToken", clearOpts);
      return res.sendStatus(500);
    }
  } catch (err) {
    // Token invalid/expired: clear cookie and return 403 to indicate invalid token
    logger.warn(
      { err, ip: req.ip },
      "Refresh token invalid or expired - clearing cookie and rejecting"
    );
    if (process.env.NODE_ENV !== "production")
      logger.debug({ stack: err && err.stack }, "token error stack");
    res.clearCookie("refreshToken", clearOpts);
    return res.sendStatus(403);
  }
};

module.exports = { logout };
