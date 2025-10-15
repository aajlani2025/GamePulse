const { z } = require("zod");

// Minimal push payload: producers only send player_id, timestamp and fatigue_level
const PushSchema = z.object({
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
  pos_x: z
    .number()
    .or(z.string())
    .transform((v) => Number(v)),
  pos_y: z
    .number()
    .or(z.string())
    .transform((v) => Number(v)),
});

module.exports = { PushSchema, PositionSchema };
