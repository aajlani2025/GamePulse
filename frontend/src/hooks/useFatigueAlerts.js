import { useEffect, useRef, useState } from "react";

/* Alert thresholds */
const CRIT_3_HOLD_MIN = 0.1;
const CRIT_4_HOLD_MIN = 0.05;
const CRIT_3_HOLD_MS = CRIT_3_HOLD_MIN * 60 * 1000;
const CRIT_4_HOLD_MS = CRIT_4_HOLD_MIN * 60 * 1000;
const ALERT_SNOOZE_MIN = 2;
const ALERT_SNOOZE_MS = ALERT_SNOOZE_MIN * 60 * 1000;
const ALERT_SCAN_MS = 5000;

export function useFatigueAlerts({ playerIds, levelsRef, inFieldRef, addAlert, debug = false }) {
  const [alert, setAlert] = useState({
    open: false,
    pid: null,
    minutes: "0.0",
    level: null,
  });

  const level3SinceRef = useRef(Object.fromEntries(playerIds.map((id) => [id, 0])));
  const level4SinceRef = useRef(Object.fromEntries(playerIds.map((id) => [id, 0])));
  const lastAlertAtRef = useRef(Object.fromEntries(playerIds.map((id) => [id, { 3: 0, 4: 0 }])));
  const lastAlertLevelRef = useRef(Object.fromEntries(playerIds.map((id) => [id, 0])));

  function triggerAlert(pid, since, now, level) {
    const minutes = ((now - since) / 60000).toFixed(1);

    setAlert({ open: true, pid, minutes, level });
    lastAlertAtRef.current[pid][level] = now;
    lastAlertLevelRef.current[pid] = level;

    addAlert({
      pid,
      level,
      durationMinutes: Number(minutes),
      startedAt: new Date(since).toISOString(),
      triggeredAt: new Date(now).toISOString(),
      message: `Player ${pid} has been at fatigue level ${level} for ${minutes} min.`,
    });

    if (debug) {
      console.debug("ALERT", { pid, level, minutes });
    }

    if (level === 4) {
      level4SinceRef.current[pid] = 0;
      level3SinceRef.current[pid] = 0;
      lastAlertAtRef.current[pid][3] = now;
    } else {
      level4SinceRef.current[pid] = 0;
    }
  }

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();

      for (const pid of playerIds) {
        const level = levelsRef.current[pid];
        const onField = inFieldRef.current[pid];

        if (!onField || level < 3) {
          level3SinceRef.current[pid] = 0;
          level4SinceRef.current[pid] = 0;
          lastAlertLevelRef.current[pid] = 0;
          continue;
        }

        if (level === 3 && !level3SinceRef.current[pid]) {
          level3SinceRef.current[pid] = now;
        }
        if (level === 4 && !level4SinceRef.current[pid]) {
          level4SinceRef.current[pid] = now;
          level3SinceRef.current[pid] = 0;
        }

        if (level === 4) {
          const since4 = level4SinceRef.current[pid];
          const longEnough = now - since4 >= CRIT_4_HOLD_MS;
          const snoozed = now - (lastAlertAtRef.current[pid][4] || 0) >= ALERT_SNOOZE_MS;
          const escalated = lastAlertLevelRef.current[pid] === 3;
          if (longEnough && (snoozed || escalated)) {
            triggerAlert(pid, since4, now, 4);
            continue;
          }
        }

        if (level === 3) {
          const since3 = level3SinceRef.current[pid];
          const longEnough = now - since3 >= CRIT_3_HOLD_MS;
          const snoozed = now - (lastAlertAtRef.current[pid][3] || 0) >= ALERT_SNOOZE_MS;

          if (longEnough && snoozed) {
            triggerAlert(pid, since3, now, 3);
          }
        }
      }
    }, ALERT_SCAN_MS);

    return () => clearInterval(id);
  }, []);

  return {
    alert,
    closeAlert: () => setAlert((a) => ({ ...a, open: false })),
  };
}
