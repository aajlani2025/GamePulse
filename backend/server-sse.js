const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());

let clients = [];

// --- Route SSE ---
app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  clients.push(res);

  req.on("close", () => {
    clients = clients.filter((c) => c !== res);
  });
});

// --- Fonction pour pousser les données ---
function sendData(data) {
  clients.forEach((client) => {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}

// --- Route POST pour pousser des données ---
app.post("/push", (req, res) => {
  sendData(req.body);
  res.sendStatus(200);
});

// --- Port ---
const PORT = 4000;
app.listen(PORT, () =>
  console.log(`SSE server running on http://localhost:${PORT}`)
);
