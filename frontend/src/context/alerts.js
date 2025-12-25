import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";

function secureId(len = 12) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, len);
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytesNeeded = Math.ceil(len / 2);
    const arr = new Uint8Array(bytesNeeded);
    crypto.getRandomValues(arr);
    const hex = Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
    return hex.slice(0, len);
  }

  // Node.js crypto fallback
  try {
    const { randomBytes } = require("crypto");
    return randomBytes(Math.ceil(len / 2))
      .toString("hex")
      .slice(0, len);
  } catch {
    return (
      Date.now().toString(36) +
      "-" +
      Math.floor(process.hrtime.bigint() % 0xffffffffn).toString(36)
    ).slice(0, len);
  }
}

const AlertsContext = createContext(null);
const LS_KEY = "gp_alerts";
const MAX_ALERTS = 500;

export function AlertsProvider({ children }) {
  const [alerts, setAlerts] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(alerts));
    } catch {}
  }, [alerts]);

  const addAlert = useCallback((a) => {
    const id = a.id ?? secureId(12);
    // normalize fields for consistent UI rendering
    const pid = a.pid ?? a.player_id ?? a.playerId ?? "unknown";
    const rawLevel = a.level ?? null;
    const level =
      typeof rawLevel === "string" || typeof rawLevel === "number" ? Number(rawLevel) : null;
    const durationMinutes =
      a.durationMinutes ??
      (a.delay_seconds ? Math.round(Number(a.delay_seconds) / 60) : a.durationMinutes ?? 0);
    const startedAt = a.startedAt ?? a.timestamp ?? new Date().toISOString();
    const triggeredAt = a.triggeredAt ?? a.received_at ?? new Date().toISOString();
    const kind = a.kind ?? (a.type ? "webhook" : level && level > 0 ? "fatigue" : "other");
    const subtype = a.type ?? a.subtype ?? null;
    const source = a.source ?? null;
    const message =
      a.message ??
      (a.type === "missing_data"
        ? `Missing data from ${a.source || "unknown"} for player ${pid}`
        : a.type === "delayed_data"
        ? `Delayed data (${a.delay_seconds ?? "?"}s) for player ${pid}`
        : a.msg ?? "");

    setAlerts((prev) =>
      [
        {
          ...a,
          id,
          pid,
          level,
          durationMinutes,
          startedAt,
          triggeredAt,
          kind,
          subtype,
          source,
          message,
        },
        ...prev,
      ].slice(0, MAX_ALERTS)
    );
  }, []);

  const clearAlerts = useCallback(() => setAlerts([]), []);
  const removeAlert = useCallback((id) => setAlerts((prev) => prev.filter((x) => x.id !== id)), []);

  const value = useMemo(
    () => ({ alerts, addAlert, clearAlerts, removeAlert }),
    [alerts, addAlert, clearAlerts, removeAlert]
  );

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}
AlertsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
export function useAlerts() {
  const ctx = useContext(AlertsContext);
  if (!ctx) throw new Error("useAlerts must be used within AlertsProvider");
  return ctx;
}
