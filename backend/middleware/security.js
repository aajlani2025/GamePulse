
// Ensures requests with Content-Type application/json do not exceed the
// same size limit used by express.json (8 KiB). If Content-Length is not
// provided (chunked transfer), the middleware will allow the request to
// continue and rely on express.json to enforce the limit.

const MAX_JSON_BYTES = 8 * 1024; // 8 KiB

function jsonLimiter(req, res, next) {
  try {
    const method = (req.method || "").toUpperCase();
    if (method === "POST" || method === "PUT" || method === "PATCH") {
      const contentType = (req.headers["content-type"] || "").toLowerCase();
      if (contentType.includes("application/json")) {
        const len = parseInt(req.headers["content-length"] || "0", 10);
        if (len && len > MAX_JSON_BYTES) {
          return res.status(413).json({ error: "payload_too_large" });
        }
      }
    }
  } catch (err) {
    // If anything goes wrong in this quick guard, don't block the request;
    // let downstream parsers/validators handle it and capture/log the error.
    return next();
  }

  return next();
}

module.exports = { jsonLimiter };
