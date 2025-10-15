const jwt = require("jsonwebtoken");
const authService = require("../services/authService");
const logger = require("../config/logger");
const { revokeUserApproval } = require("../services/approvalService");

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
    // Verify token and extract subject (id) and username
    const payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const userId = payload?.sub ?? null;
    const username = payload?.username ?? null;

    // Require at least an id (preferred) or username (fallback) to proceed
    if (!userId && !username) {
      // malformed token
      logger.warn(
        { ip: req.ip },
        "Malformed refresh token - missing subject (sub) and username"
      );
      res.clearCookie("refreshToken", clearOpts);
      return res.sendStatus(403);
    }

    logger.info(
      { userId, username, ip: req.ip },
      "Clearing stored refresh token for user"
    );

    try {
      // Prefer to clear by user id (sub) if available in token payload
      const userId = payload?.sub ?? null;
      if (userId != null) {
        await authService.clearRefreshForUserId(userId);
      } else {
        // fallback for older tokens: clear by username
        await authService.clearRefreshForUsername(username);
      }
      res.clearCookie("refreshToken", clearOpts);
      // Revoke any stored approval on logout so re-login requires fresh consent
      try {
        const userId = payload?.sub ?? null;
        const usersRepo = require("../repositories/usersRepository");
        const found = await usersRepo.findById(userId);
        if (found) {
          await revokeUserApproval(userId);
          logger.info(
            { userId, username, ip: req.ip },
            "Revoked user approval on logout by id"
          );
        } else {
          // Fallback: attempt to look up user id by username and revoke
          try {
            const usersRepo = require("../repositories/usersRepository");
            const found = await usersRepo.findByUsername(username);
            if (found && found.id != null) {
              await revokeUserApproval(found.id);
              logger.info(
                { userId: found.id, username, ip: req.ip },
                "Revoked user approval on logout by lookup"
              );
            } else {
              logger.warn(
                { username, ip: req.ip },
                "Could not find user id to revoke approval on logout"
              );
            }
          } catch (lookupErr) {
            logger.warn(
              { err: lookupErr, username, ip: req.ip },
              "Failed to lookup user id to revoke approval on logout"
            );
          }
        }
      } catch (revErr) {
        logger.warn(
          { err: revErr, username, ip: req.ip },
          "Failed to revoke approval on logout"
        );
      }
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
