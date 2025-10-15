const authService = require("../services/authService");
const logger = require("../config/logger");

// handleLogin: validate input, call service to perform login flow, and set cookie.
const handleLogin = async (req, res) => {
  const raw = req.body || {};
  const usernameRaw = raw.username;
  const passwordRaw = raw.password;

  const username =
    typeof usernameRaw === "string"
      ? usernameRaw.trim()
      : String(usernameRaw || "");
  const password =
    typeof passwordRaw === "string"
      ? passwordRaw
      : passwordRaw != null
      ? String(passwordRaw)
      : "";

  if (!username || !password){
    logger.warn( "username or password missing");
    return res
      .status(400)
      .json({ message: "Username and password are required." });
  };
    
  try {
    const tokens = await authService.loginFlow(username, password);
    if (!tokens) {
      logger.warn("no tokens");
      return res.status(401).json({ error: "Invalid username or password" });};

    const { accessToken, refreshToken } = tokens;

    const isProd = process.env.NODE_ENV === "production";
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: isProd ? "None" : "Lax",
      secure: isProd,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    return res.json({ accessToken });
  } catch (err) {
    logger.error({ err }, "Login error");
    if (err && err.message === "Ambiguous credentials") {
      return res.status(409).json({ error: "Ambiguous credentials" });
    }
    return res.status(500).json({ error: "internal_server_error" });
  }
};

module.exports = { handleLogin };
