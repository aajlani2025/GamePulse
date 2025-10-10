const logger = require("../config/logger");

function errorHandler(err, req, res, next) {
  logger.error({ err, url: req.url, method: req.method }, "Unhandled error");
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "internal_server_error" });
}

module.exports = { errorHandler };
