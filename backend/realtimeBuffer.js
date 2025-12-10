import axios from "axios";

const buffers = new Map(); // playerId -> { hr: [], imu: [] }

const WINDOW_MS = 5000;
const STRIDE_MS = 2000;

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

function buildWindowsIfReady(playerId) {
  const buf = buffers.get(playerId);
  if (!buf) return;

  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const hrWindow = buf.hr.filter((x) => x.ts >= windowStart);
  const imuWindow = buf.imu.filter((x) => x.ts >= windowStart);

  if (hrWindow.length < 5 || imuWindow.length < 5) return;

  const payload = {
    playerId,
    samplingHz: 52,
    window: {
      startTs: windowStart,
      endTs: now,
      hr: hrWindow.map((x) => x.hr),
      acc: imuWindow.map((x) => x.acc),
      gyro: imuWindow.map((x) => x.gyro),
    },
  };

  console.log("WINDOW READY → (bientôt) envoi à n8n:", payload);

  // Plus tard :
  // await axios.post("https://<n8n>/webhook/gamepulse-realtime", payload);

  buf.hr = buf.hr.filter((x) => x.ts >= now - WINDOW_MS - STRIDE_MS);
  buf.imu = buf.imu.filter((x) => x.ts >= now - WINDOW_MS - STRIDE_MS);
}
