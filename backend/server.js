require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const pinoHttp = require("pino-http");
const logger = require("./config/logger");

// Custom configs & middleware
const cors = require("./config/cors");
const rateLimit = require("./config/rateLimit");
const { jsonLimiter } = require("./middleware/security");
const { errorHandler } = require("./middleware/errorHandler");
// ---------- Middlewares ----------
// JWT middleware (for protected routes)
const authMiddleware = require("./middleware/authMiddleware");

// Routes
const sseRoutes = require("./routes/sseRoutes");
const authRoutes = require("./routes/authRoutes");
const webhookRoutes = require("./routes/WebhookAlerteRoute");
const pushPositionRoutes = require("./routes/pushPositionRoutes");

const app = express();

// Cookie parser (needed for refresh tokens in HttpOnly cookies)
app.use(cookieParser());

// Logging
app.use(
  pinoHttp({
    logger,
    customLogLevel: (req, res, err) => {
      if (res.statusCode >= 400 && res.statusCode < 500) return "warn";
      if (res.statusCode >= 500 || err) return "error";
      return "info";
    },
    customSuccessMessage: (req, res) =>
      `${req.method} ${req.url} completed with status ${res.statusCode}`,
  })
);

// Security headers
app.use(helmet());

// JSON body parser with size limit
app.use(express.json({ limit: "8kb" }));
app.use(jsonLimiter);

// CORS
app.use(cors);

// ---------- Routes ----------

// Authentication (login, register, refresh, logout)
app.use("/auth", authRoutes);

// SSE events (server-sent events stream)
app.use("/events", sseRoutes);

// Push API (rate-limited) — uses same router but different mount path
app.use("/push", rateLimit, sseRoutes);
// Position-only pushes (rate-limited)
app.use("/push_position", rateLimit, pushPositionRoutes);
app.use("/webhook", webhookRoutes);
// ---------- Error Handling ----------
app.use(errorHandler);

// ---------- Start Server ----------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
});
