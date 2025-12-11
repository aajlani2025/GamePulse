import axios from "axios";

const N8N_WEBHOOK_URL =
  "https://toulouse123.app.n8n.cloud/webhook/gamepulse-realtime";

const buffers = new Map(); // playerId -> { hr: [], imu: [] }

const WINDOW_MS = 5000;
const STRIDE_MS = 2000;

/**
 * Réception d'un message capteur pour un playerId donné.
 * msg = {
 *   type: "HR" | "IMU",
 *   ts: number (timestamp ms),
 *   data: { hr } ou { acc, gyro }
 * }
 */
export function handleSensorMessage(playerId, msg) {
  if (!buffers.has(playerId)) {
    buffers.set(playerId, { hr: [], imu: [] });
  }

  const buf = buffers.get(playerId);

  if (msg.type === "HR") {
    buf.hr.push({ ts: msg.ts, hr: msg.data.hr });
  } else if (msg.type === "IMU") {
    buf.imu.push({
      ts: msg.ts,
      acc: msg.data.acc,
      gyro: msg.data.gyro,
    });
  }

  buildWindowsIfReady(playerId);
}

/**
 * Construit une fenêtre dès qu'on a assez d'échantillons
 * et l'envoie à n8n.
 */
function buildWindowsIfReady(playerId) {
  const buf = buffers.get(playerId);
  if (!buf) return;

  // 🔹 Mode dev : on ignore les timestamps, on se base juste sur le nombre d’échantillons
  if (buf.hr.length < 5 || buf.imu.length < 5) {
    return;
  }

  // On prend les 5 derniers échantillons de chaque
  const hrWindow = buf.hr.slice(-5);
  const imuWindow = buf.imu.slice(-5);

  const now = Date.now();
  const startTs = hrWindow[0].ts ?? now - WINDOW_MS;
  const endTs = now;

  const payload = {
    playerId,
    samplingHz: 52,
    window: {
      startTs,
      endTs,
      hr: hrWindow.map((x) => x.hr),
      acc: imuWindow.map((x) => x.acc),
      gyro: imuWindow.map((x) => x.gyro),
    },
  };

  console.log("WINDOW READY → envoi à n8n:", payload);

  axios
    .post(N8N_WEBHOOK_URL, payload)
    .then(() => {
      console.log("✅ Fenêtre envoyée à n8n");
    })
    .catch((err) => {
      console.error("❌ Erreur en envoyant la fenêtre à n8n:", err.message);
    });

  // On conserve uniquement la dernière fenêtre
  buf.hr = hrWindow;
  buf.imu = imuWindow;
}

