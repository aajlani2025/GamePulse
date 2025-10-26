const { z } = require("zod");

// Minimal push payload: producers only send player_id, timestamp and fatigue_level
const FatigueSchema = z.object({
  player_id: z.union([z.number(), z.string()]),
  timestamp: z.optional(z.union([z.string(), z.number()])),
  // allow explicit `null` from producers (treat as missing)
  fatigue_level: z.optional(z.number().nullable()),
});

// Position-only payload (pos_x / pos_y). Producers may POST positions to a
// separate endpoint; keep schema minimal and allow numeric strings.
const PositionSchema = z.object({
  player_id: z.union([z.number(), z.string()]),
  timestamp: z.optional(z.union([z.string(), z.number()])),
  // Treat empty/whitespace strings as missing (null). Non-finite values
  // become null as well. The transform returns either a Number or null.
  pos_x: z.union([z.number(), z.string(), z.null()]).transform((v) => {
    if (v === null) return null;
    if (typeof v === "string") {
      if (v.trim() === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    return Number.isFinite(v) ? v : null;
  }),
  pos_y: z.union([z.number(), z.string(), z.null()]).transform((v) => {
    if (v === null) return null;
    if (typeof v === "string") {
      if (v.trim() === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    return Number.isFinite(v) ? v : null;
  }),
});

module.exports = { FatigueSchema, PositionSchema };
