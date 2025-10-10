const logger = require("../config/logger");

const clients = new Set();

function sendEvent(payload, eventName = "player_update") {
  const line = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) {
    try {
      res.write(line);
    } catch (err) {
      clients.delete(res);
      logger.warn({ err }, "Failed to write SSE to client, removing");
    }
  }
}

function addClient(req, res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  clients.add(res);
  logger.info({ client: req.ip }, "New SSE client connected");

  const hb = setInterval(() => res.write(`: keep-alive\n\n`), 25000);

  req.on("close", () => {
    clearInterval(hb);
    clients.delete(res);
    logger.info({ client: req.ip }, "SSE client disconnected");
  });
}

module.exports = { sendEvent, addClient };
