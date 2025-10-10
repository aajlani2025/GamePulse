const cors = require("cors");

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim())
  : ["http://localhost:3000"];

// Lightweight diagnostic: log incoming origin and allowed origins when origin present.
// This helps debug why browser requests (with Origin header) succeed/fail while Postman (no Origin)
// is allowed.
module.exports = cors({
  origin: (origin, callback) => {
    if (!origin) {
      // No Origin (curl/Postman or same-origin script) -> allow
      return callback(null, true);
    }

    // Diagnostic log
    try {
      console.info(
        `[cors] request origin=${origin} allowedOrigins=${JSON.stringify(
          allowedOrigins
        )}`
      );
    } catch (e) {
    }

    if (allowedOrigins.includes(origin)) return callback(null, true);

    console.warn(`[cors] rejecting origin: ${origin}`);
    callback(new Error("CORS not allowed"));
  },
  optionsSuccessStatus: 200,
  credentials: true, // allow cookies to be sent/received by browser
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
