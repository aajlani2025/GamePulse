//this logger will write all logs to the file, including info, warn,
// and error levels.it will trace all requests directed to the server and
// log them in the server.log file located in the logs directory.
const fs = require("fs");
const pino = require("pino");

if (!fs.existsSync("./logs")) {
  fs.mkdirSync("./logs", { recursive: true });
}

module.exports = pino(
  { level: process.env.LOG_LEVEL || "info" },
  pino.destination("./logs/server.log")
);
