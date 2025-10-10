function coercePlayerId(val) {
  if (typeof val === "number" && Number.isFinite(val)) return Math.trunc(val);
  if (typeof val === "string") {
    const m = /^p?(\d+)$/i.exec(val.trim());
    if (m) return Math.trunc(Number(m[1]));
  }
  throw new Error("Invalid player_id");
}

function to01(v) {
  const s = String(v).toLowerCase();
  if (["1", "yes", "true"].includes(s)) return 1;
  if (["0", "no", "false"].includes(s)) return 0;
  return null;
}

module.exports = { coercePlayerId, to01 };
