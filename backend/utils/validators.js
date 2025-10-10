const { z } = require("zod");

const PushSchema = z.object({
  player_id: z.union([z.number(), z.string()]),
  timestamp: z.optional(z.union([z.string(), z.number()])),
  hr: z.optional(z.number()),
  hrv: z.optional(z.number()),
  respiration: z.optional(z.number()),
  pos_x: z.optional(z.number()),
  pos_y: z.optional(z.number()),
  cod: z.optional(z.any()),
  sprint: z.optional(z.any()),
  distanceHI: z.optional(z.number()),
  impact: z.optional(z.any()),
  fatigue_level: z.optional(z.number()),
  rr: z.optional(z.number()),
});

module.exports = { PushSchema };
