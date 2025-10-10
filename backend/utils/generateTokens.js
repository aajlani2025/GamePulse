const jwt = require("jsonwebtoken");

function generateAccessToken(user) {
  const payload = { sub: user.id };
  if (user && user.username) payload.username = user.username;
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "15m",
  });
}

function generateRefreshToken(user) {
  const payload = {};
  if (user && user.id != null) payload.sub = user.id;
  if (user && user.username) payload.username = user.username;
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "1d",
  });
}

module.exports = { generateAccessToken, generateRefreshToken };
