
// Keep normalization deterministic: numeric strings are coerced when safe,
// non-finite values become `null`.

function toFiniteNumber(v) {
  // treat null/undefined as missing
  if (v === null || v === undefined) return null;
  // treat empty or whitespace-only strings as missing
  if (v === "" || (typeof v === "string" && v.trim() === "")) return null;
  if (Number.isFinite(v)) return v;
  // try coercion for string/other types
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}


function normalizePositionMetrics({ timestamp, pos_x, pos_y } = {}) {
  const ts = toFiniteNumber(timestamp);
  const x = toFiniteNumber(pos_x);
  const y = toFiniteNumber(pos_y);

  return {
    timestamp: ts ?? null,
    pos_x: x ?? null,
    pos_y: y ?? null,
  };
}

module.exports = { normalizePositionMetrics };
