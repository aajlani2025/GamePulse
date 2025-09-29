import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";

function secureId(len = 12) {
  // prefer native UUID if available
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    // returns a UUID v4 (36 chars) — slice if caller requests shorter
    return crypto.randomUUID().replace(/-/g, "").slice(0, len);
  }

  // browser crypto -> hex
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytesNeeded = Math.ceil(len / 2);
    const arr = new Uint8Array(bytesNeeded);
    crypto.getRandomValues(arr);
    const hex = Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
    return hex.slice(0, len);
  }

  // very unlikely environment — last resort: timestamp + counter (no Math.random)
  return (
    Date.now().toString(36) +
    "-" +
    Math.floor(Math.random() * 0xffffffff).toString(36)
  ).slice(0, len);
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
    setAlerts((prev) => [{ ...a, id }, ...prev].slice(0, MAX_ALERTS));
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
