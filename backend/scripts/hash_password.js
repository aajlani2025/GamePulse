#!/usr/bin/env node
/**
 * Simple helper to hash a password with bcrypt.
 * Usage:
 *   node backend/scripts/hash_password.js           # uses default password " 12345" and 10 rounds
 *   node backend/scripts/hash_password.js "mypwd" 12  # uses password 'mypwd' and 12 rounds
 */

const bcrypt = require("bcrypt");

const argv = process.argv.slice(2);
const password = argv[0] != null ? String(argv[0]) : " 12345"; // note the leading space as requested
const rounds = argv[1] != null ? Number(argv[1]) : 10;

if (!Number.isInteger(rounds) || rounds <= 0) {
  console.error("Invalid rounds. Must be a positive integer.");
  process.exit(2);
}

(async function main() {
  try {
    const hash = await bcrypt.hash(password, rounds);
    console.log(hash);
  } catch (err) {
    console.error("Hashing failed:", err);
    process.exit(1);
  }
})();
