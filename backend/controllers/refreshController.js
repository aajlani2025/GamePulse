const authService = require("../services/authService");

// handleRefresh: verify refresh cookie, rotate it (via service), and return new access token
const handleRefresh = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.sendStatus(401);

  try {
    // decode to extract username (will throw if signature invalid)
    const payload = require("jsonwebtoken").verify(
      token,
      process.env.REFRESH_TOKEN_SECRET
    );
    const username = payload?.username;
    if (!username) return res.sendStatus(403);

    // delegate validation + rotation to authService
    const { accessToken, refreshToken } = await authService.rotateRefreshToken(
      token,
      username
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
    console.error("Refresh error", err);
    return res.sendStatus(403);
  }
};

module.exports = { handleRefresh };
