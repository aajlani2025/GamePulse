const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const usersRepo = require("../repositories/usersRepository");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/generateTokens");

const SALT_ROUNDS = Number(process.env.SALT_ROUNDS) || 10;

// function to authenticate user by username and password
async function authenticateByUsernameAndPassword(username, password) {
  const norm = String(username || "").trim();
  const found = await usersRepo.findByUsername(norm);
  if (!found) return null;

  const hash = found.password_hash;
  if (!hash || typeof hash !== "string") return null;

  try {
    const ok = await bcrypt.compare(String(password), String(hash));
    return ok ? found : null;
  } catch (e) {
    return null;
  }
}

// store the hash of the refresh token for the user id
async function storeRefreshHashForUser(id, refreshToken) {
  const h = await bcrypt.hash(refreshToken, SALT_ROUNDS);
  await usersRepo.updateRefreshHashById(id, h);
}
// clear the stored refresh token hash for the given username (fallback)
async function clearRefreshForUsername(username) {
  return usersRepo.updateRefreshHashByUsername(username, "");
}

// clear the stored refresh token hash for the given user id (preferred)
async function clearRefreshForUserId(id) {
  return usersRepo.updateRefreshHashById(id, "");
}
// Perform login flow: authenticate, generate tokens, store refresh hash, return tokens
async function loginFlow(username, password) {
  const user = await authenticateByUsernameAndPassword(username, password);
  if (!user) return null;

  const id = user.id;
  const accessToken = generateAccessToken({ id, username: user.username });
  const refreshToken = generateRefreshToken({ id, username: user.username });
  await storeRefreshHashForUser(id, refreshToken);
  return { accessToken, refreshToken };
}

/**
 * Validate presented refresh token against the stored hash for the username.
 * If valid, rotate (issue new refresh token and store its hash) and return
 * { accessToken, refreshToken }.
 * If invalid/expired, throw an error.
 */
async function rotateRefreshToken(presentedToken) {
  if (!presentedToken) throw new Error("invalid_request");

  // First decode/verify the refresh token to extract subject (id)
  let payload;
  try {
    payload = jwt.verify(presentedToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    throw new Error("invalid_refresh");
  }

  const userId = payload?.sub ?? null;
  const username = payload?.username ?? null; // fallback

  let found = null;
  if (userId != null) {
    found = await usersRepo.findById(userId);
  }
  // migration fallback to username if token lacks sub
  if (!found && username) {
    found = await usersRepo.findByUsername(username);
  }
  if (!found) throw new Error("not_found");

  const storedHash = found.refresh_token_hash || "";
  if (!storedHash) throw new Error("no_stored_token");

  // normalize inputs to strings
  const presented = String(presentedToken);
  const stored = String(storedHash);

  let matches = false;
  try {
    // Only allow bcrypt hashed tokens
    if (!stored.startsWith("$2")) {
      // Immediately revoke non-bcrypt tokens by id
      await usersRepo.updateRefreshHashById(found.id, "");
      throw new Error("insecure_token_format");
    }

    matches = await bcrypt.compare(presented, stored);
  } catch (e) {
    matches = false;
  }
  if (!matches) {
    // revoke stored token (id-based)
    try {
      await usersRepo.updateRefreshHashById(found.id, "");
    } catch (e) {}
    throw new Error("invalid_refresh");
  }

  // matched — rotate (prefer id when storing)
  const newRefreshToken = generateRefreshToken({
    id: found.id,
    username: found.username,
  });
  const newRefreshHash = await bcrypt.hash(newRefreshToken, SALT_ROUNDS);
  await usersRepo.updateRefreshHashById(found.id, newRefreshHash);

  const accessToken = generateAccessToken({
    username: found.username,
    id: found.id,
  });
  return { accessToken, refreshToken: newRefreshToken };
}

module.exports = {
  loginFlow,
  authenticateByUsernameAndPassword,
  storeRefreshHashForUser,
  clearRefreshForUsername,
  clearRefreshForUserId,
  rotateRefreshToken,
};
