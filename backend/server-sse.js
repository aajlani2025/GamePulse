require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.API_KEY; 

let clients = [];

// Middleware d'authentification
function apiKeyAuth(req, res, next) {
  const key = req.headers["x-api-key"];
  if (key && key === API_KEY) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
}

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
app.post("/push", apiKeyAuth, (req, res) => {
  sendData(req.body);
  res.sendStatus(200);
});

let positionClients = [];

// --- Route SSE pour les positions ---
app.get("/positions", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  positionClients.push(res);

  req.on("close", () => {
    positionClients = positionClients.filter((c) => c !== res);
  });
});

// --- Fonction pour pousser les positions ---
function sendPosition(data) {
  positionClients.forEach((client) => {
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}

// --- Route POST pour pousser des positions ---
app.post("/push_position", apiKeyAuth, (req, res) => {
  sendPosition(req.body);
  res.sendStatus(200);
});

// --- Port ---
const PORT = 4000;
app.listen(PORT, () =>
  console.log(`SSE server running on http://localhost:${PORT}`)
);
