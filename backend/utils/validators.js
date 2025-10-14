const { z } = require("zod");

// Minimal push payload: producers only send player_id, timestamp and fatigue_level
const PushSchema = z.object({
  player_id: z.union([z.number(), z.string()]),
  timestamp: z.optional(z.union([z.string(), z.number()])),
  fatigue_level: z.optional(z.number()),
});

module.exports = { PushSchema };
