const authService = require("../services/authService");
const logger = require("../config/logger");

// handleRefresh: verify refresh cookie, rotate it (via service), and return new access token
const handleRefresh = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.sendStatus(401);

  try {
    // Delegate validation + rotation to authService which will verify the token
    // and use the embedded subject (user id) as the authoritative lookup key.
    const { accessToken, refreshToken } = await authService.rotateRefreshToken(
      token
    );

    // set new refresh cookie
    const isProd = process.env.NODE_ENV === "production";
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: isProd ? "None" : "Lax",
      secure: isProd,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    return res.json({ accessToken });
  } catch (err) {
    logger.warn({ err }, "Refresh error");
    return res.sendStatus(403);
  }
};

module.exports = { handleRefresh };
