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

// --- ROUTES API EXISTANTES ---
app.get("/health", (_, res) => res.json({ status: "ok" }));
app.get("/api/hello", (_, res) => res.json({ message: "Hello from GamePulse API" }));

app.get("/api/ping-db", async (_, res) => {
  if (!DATABASE_URL) return res.status(200).json({ db: "skipped (no DATABASE_URL)" });
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

// --- CRÉATION SERVEUR HTTP ---
const server = http.createServer(app);

// --- SERVEUR WEBSOCKET ---
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const playerId = url.searchParams.get("playerId") || "UNKNOWN";

  console.log("WS CONNECTED → Player:", playerId);

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      handleSensorMessage(playerId, msg);
    } catch (err) {
      console.error("Invalid WS message:", err);
    }
  });

  ws.on("close", () => {
    console.log("WS CLOSED → Player:", playerId);
  });
});

// --- LANCEMENT HTTP + WS ---
server.listen(PORT, "0.0.0.0", () =>
  console.log(`GamePulse API + WebSocket listening on ${PORT}`)
);
