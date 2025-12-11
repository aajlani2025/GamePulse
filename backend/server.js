// backend/server.js
import express from "express";
import cors from "cors";
import pkg from "pg";
import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import { handleSensorMessage } from "./realtimeBuffer.js";

const { Pool } = pkg;
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8000;
const DATABASE_URL = process.env.DATABASE_URL;

// /health: pour les probes
app.get("/health", (_, res) => res.json({ status: "ok" }));

// /api/hello: test rapide
app.get("/api/hello", (_, res) =>
  res.json({ message: "Hello from GamePulse API" })
);

// /api/ping-db: ping Timescale/Postgres si dispo
app.get("/api/ping-db", async (_, res) => {
  if (!DATABASE_URL)
    return res
      .status(200)
      .json({ db: "skipped (no DATABASE_URL)" });

  const pool = new Pool({ connectionString: DATABASE_URL, ssl: false });
  try {
    const r = await pool.query("SELECT NOW() as now");
    res.json({ db: "ok", now: r.rows[0].now });
  } catch (e) {
    res.status(500).json({ db: "error", error: String(e) });
  } finally {
    pool.end();
  }
});

// 🚀 ENDPOINT D’INGESTION MOVESENSE (HTTP, depuis n8n ou autre)
app.post("/api/v1/ingestion/movesense", (req, res) => {
  const payload = req.body;

  console.log("📥 Movesense payload received:");
  console.log(JSON.stringify(payload, null, 2));

  return res.status(200).json({
    status: "ok",
    message: "Movesense data ingested",
    received: {
      player_id: payload.player_id,
      session_id: payload.session_id,
      source: payload.source,
      context: payload.context,
      hr_length: Array.isArray(payload.hr) ? payload.hr.length : 0,
      imu_length: Array.isArray(payload.imu) ? payload.imu.length : 0,
    },
  });
});

// 🚀 ENDPOINT PREDICT FATIGUE (STUB)
app.post("/predict/fatigue", (req, res) => {
  const playerId = req.body.playerId;

  // Niveau de fatigue simulé (0, 1, 2 ou 3)
  const fatigue_level = Math.floor(Math.random() * 4);

  res.json({
    playerId,
    fatigue_level,
    confidence: 0.9,
    recommendation:
      fatigue_level <= 1
        ? "Play"
        : fatigue_level === 2
        ? "Rest"
        : "Substitute",
  });
});

// === 🔌 SERVEUR HTTP + WEBSOCKET ===

// on crée un vrai serveur HTTP autour d’Express
const server = http.createServer(app);

// serveur WebSocket sur /ws
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const playerId = url.searchParams.get("playerId") || "UNKNOWN";

  console.log("WS CONNECTED → Player:", playerId);

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      // msg = { type: "HR" | "IMU", ts, data: {...} }
      handleSensorMessage(playerId, msg);
    } catch (err) {
      console.error("Invalid WS message:", err);
    }
  });

  ws.on("close", () => {
    console.log("WS CLOSED → Player:", playerId);
  });
});

// on démarre HTTP + WS
server.listen(PORT, "0.0.0.0", () => {
  console.log(`GamePulse API + WebSocket listening on ${PORT}`);
});

