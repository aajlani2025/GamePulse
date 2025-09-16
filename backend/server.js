import express from "express";
import cors from "cors";
import pkg from "pg";

const { Pool } = pkg;
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8000;
const DATABASE_URL = process.env.DATABASE_URL;

// /health: pour les probes
app.get("/health", (_, res) => res.json({ status: "ok" }));

// /api/hello: test rapide
app.get("/api/hello", (_, res) => res.json({ message: "Hello from GamePulse API" }));

// /api/ping-db: ping Timescale/Postgres si dispo
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

app.listen(PORT, "0.0.0.0", () => console.log(`API listening on ${PORT}`));
