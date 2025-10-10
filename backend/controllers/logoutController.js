const jwt = require("jsonwebtoken");
const authService = require("../services/authService");

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
    res.clearCookie("refreshToken", clearOpts);
    return res.sendStatus(204);
  }

  try {
    // Verify token and extract username
    const payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const username = payload?.username;
    if (!username) {
      // malformed token
      res.clearCookie("refreshToken", clearOpts);
      return res.sendStatus(403);
    }

    try {
      await authService.clearRefreshForUsername(username);
      res.clearCookie("refreshToken", clearOpts);
      return res.sendStatus(204);
    } catch (dbErr) {
      console.error("DB error while clearing refresh token:", dbErr);
      res.clearCookie("refreshToken", clearOpts);
      return res.sendStatus(500);
    }
  } catch (err) {
    // Token invalid/expired: clear cookie and return 403 to indicate invalid token
    res.clearCookie("refreshToken", clearOpts);
    return res.sendStatus(403);
  }
};

module.exports = { logout };
