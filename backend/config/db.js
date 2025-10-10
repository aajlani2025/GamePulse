const { Pool } = require("pg");

// Utility: strip surrounding single or double quotes from a string value.
function stripSurroundingQuotes(val) {
  if (val === undefined || val === null) return val;
  if (typeof val !== "string") return val;
  return val.replace(/^"|"$|^'|'$/g, "");
}

function mapSsl(mode) {
  if (!mode) return false;
  const m = String(mode).trim().toLowerCase();
  if (m === "disable" || m === "false") return false;
  if (m === "require" || m === "true" || m === "prefer" || m === "allow") {
    return { rejectUnauthorized: false };
  }
  if (m === "verify-ca" || m === "verify-full")
    return { rejectUnauthorized: true };
  return false;
}

const dbConfig = {
  host: stripSurroundingQuotes(process.env.DB_HOST),
  port: process.env.DB_PORT
    ? Number(stripSurroundingQuotes(process.env.DB_PORT))
    : undefined,
  database: stripSurroundingQuotes(process.env.DB_NAME),
  user: stripSurroundingQuotes(process.env.DB_USER),
  password: stripSurroundingQuotes(process.env.DB_PASS),
  ssl: mapSsl(process.env.DB_SSL || process.env.SSL_MODE),
};

if (process.env.NODE_ENV !== "production") {
  try {

    console.log("[db] DB env types:", {
      host: typeof process.env.DB_HOST,
      port: typeof process.env.DB_PORT,
      user: typeof process.env.DB_USER,
      passwordDefined: process.env.DB_PASS != null,
      passwordType: typeof process.env.DB_PASS,
    });
  } catch (e) {

  }
}

const pool = new Pool(dbConfig);

module.exports = pool;
