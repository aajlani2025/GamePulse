const rateLimit = require("express-rate-limit");
const logger = require("./logger");

module.exports = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({ ip: req.ip }, "Rate limit exceeded");
    res.status(429).json({ error: "Too many requests" });
  },
});
// Limit each IP to 120 requests per minute on /push endpoint(will later be changed when we know the real load)