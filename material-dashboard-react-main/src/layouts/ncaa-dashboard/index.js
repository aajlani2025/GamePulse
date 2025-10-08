/**
=========================================================
* Material Dashboard 2 React - v2.2.0
=========================================================
*/

import React, { useState, useEffect, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import MDBox from "components/MDBox";
import MDSnackbar from "components/MDSnackbar";
import { Table, TableBody, TableCell, TableContainer, TableRow, Paper } from "@mui/material";

import { useAlerts } from "context/alerts";

/* Colors and labels */
const FAT_COLORS = { 1: "#B6F2C2", 2: "#4DC591", 3: "#F6D66B", 4: "#F5A623", 5: "#E14C4C" };
const FAT_LABELS = {
  1: "Full energy",
  2: "Light fatigue",
  3: "Tired",
  4: "Exhausted",
  5: "Physiological overload",
};

/* Field / border (placeholder field) */
const FIELD = { xMin: 0, xMax: 120, yMin: 0, yMax: 53.3333 };
const insideField = (x, y) =>
  Number.isFinite(x) &&
  Number.isFinite(y) &&
  x >= FIELD.xMin &&
  x <= FIELD.xMax &&
  y >= FIELD.yMin &&
  y <= FIELD.yMax;

const FIELD_BORDER = { xMin: 121, xMax: 130, yMin: 54, yMax: 70 };
const insideBorder = (x, y) =>
  Number.isFinite(x) &&
  Number.isFinite(y) &&
  x >= FIELD_BORDER.xMin &&
  x <= FIELD_BORDER.xMax &&
  y >= FIELD_BORDER.yMin &&
  y <= FIELD_BORDER.yMax;

/* Roster layout */
const ALL_IDS = Array.from({ length: 40 }, (_, i) => `P${i + 1}`);

const generatePlayers = () => {
  const active = ALL_IDS.slice(0, 11);
  const replacement = ALL_IDS.slice(11, 22);
  const rotation = ALL_IDS.slice(22);
  return { active, replacement, rotation };
};

function buildIndex(groups) {
  const idx = {};
  ["active", "replacement", "rotation"].forEach((g) => {
    groups[g].forEach((pid, i) => (idx[pid] = { group: g, idx: i }));
  });
  return idx;
}

/* Alert thresholds */
const CRIT_4_HOLD_MIN = 0.1; // minutes at level-4 before alert
const CRIT_5_HOLD_MIN = 0.05; // minutes at level-5 before alert
const CRIT_4_HOLD_MS = CRIT_4_HOLD_MIN * 60 * 1000; // milliseconds
const CRIT_5_HOLD_MS = CRIT_5_HOLD_MIN * 60 * 1000; // milliseconds
const ALERT_SNOOZE_MIN = 3; // minutes per-level snooze
const ALERT_SNOOZE_MS = ALERT_SNOOZE_MIN * 60 * 1000; // milliseconds
const ALERT_SCAN_MS = 5000; // milliseconds

export default function NcaaDashboard() {
  // load persisted groups
  const initialGroups = useMemo(() => {
    try {
      const raw = localStorage.getItem("ncaa_groups");
      if (raw) return JSON.parse(raw);
    } catch {}
    return generatePlayers();
  }, []);
  const [groups, setGroups] = useState(initialGroups);

  // alerts context
  const { addAlert } = useAlerts();

  // load/persist levels
  const [levels, setLevels] = useState(() => {
    try {
      const raw = localStorage.getItem("ncaa_levels");
      if (raw) return JSON.parse(raw);
    } catch {}
    return Object.fromEntries(ALL_IDS.map((id) => [id, 1]));
  });
  const levelsRef = useRef(levels);
  useEffect(() => {
    levelsRef.current = levels;
  }, [levels]);

  const posIndexRef = useRef(buildIndex(initialGroups)); // pid → { group, idx }
  const inFieldRef = useRef(
    Object.fromEntries(ALL_IDS.map((id) => [id, initialGroups.active.includes(id)]))
  ); // pid → in-field

  useEffect(() => {
    posIndexRef.current = buildIndex(groups);
    inFieldRef.current = Object.fromEntries(ALL_IDS.map((id) => [id, groups.active.includes(id)]));
  }, [groups]);

  useEffect(() => {
    try {
      localStorage.setItem("ncaa_groups", JSON.stringify(groups));
    } catch {}
  }, [groups]); // persist groups

  useEffect(() => {
    try {
      localStorage.setItem("ncaa_levels", JSON.stringify(levels));
    } catch {}
  }, [levels]); // persist levels

  // Move player to target group
  function movePidToGroup(pid, target) {
    const cur = posIndexRef.current[pid]?.group;
    if (cur === target) return;

    setGroups((prev) => {
      const next = {
        active: [...prev.active],
        replacement: [...prev.replacement],
        rotation: [...prev.rotation],
      };

      ["active", "replacement", "rotation"].forEach((g) => {
        const i = next[g].indexOf(pid);
        if (i >= 0) next[g].splice(i, 1);
      });

      next[target].unshift(pid);
      posIndexRef.current = buildIndex(next);
      return next;
    });
  }

  /* SSE: recolor + placement */
  useEffect(() => {
    const es = new EventSource("http://localhost:4000/events");

    function handle(data) {
      const { pid, level, metrics } = data || {};
      if (!pid) return;

      // accept multiple keys for fatigue level
      const lvl = Number(
        level ??
          data?.fatigue_level ??
          data?.fatique_level ??
          metrics?.fatigue_level ??
          metrics?.fatique_level
      );
      if ([1, 2, 3, 4, 5].includes(lvl)) {
        setLevels((prev) => ({ ...prev, [pid]: lvl }));
      }

      const x = Number(metrics?.pos_x_yd ?? metrics?.pos_x);
      const y = Number(metrics?.pos_y_yd ?? metrics?.pos_y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      const isInField = insideField(x, y);
      const isInBorder = insideBorder(x, y);
      const target = isInField ? "active" : isInBorder ? "replacement" : "rotation";

      if (posIndexRef.current[pid]?.group !== target) {
        movePidToGroup(pid, target);
      }

      inFieldRef.current[pid] = isInField;
    }

    es.onmessage = (e) => {
      try {
        handle(JSON.parse(e.data));
      } catch {}
    };
    es.addEventListener("player_update", (e) => {
      try {
        handle(JSON.parse(e.data));
      } catch {}
    });
    es.onerror = (err) => console.error("[SSE error]", err);

    return () => es.close();
  }, []);

  /* Alerts: level 4 & 5 with separate timers and per-level snooze; escalate 4→5 */
  const [alert, setAlert] = useState({ open: false, pid: null, minutes: "0.0", level: null });

  const level4SinceRef = useRef(Object.fromEntries(ALL_IDS.map((id) => [id, 0])));
  const level5SinceRef = useRef(Object.fromEntries(ALL_IDS.map((id) => [id, 0])));

  // per-player, per-level snooze timestamps: { [pid]: {4:ts, 5:ts} }
  const lastAlertAtRef = useRef(Object.fromEntries(ALL_IDS.map((id) => [id, { 4: 0, 5: 0 }])));

  // last alerted level to allow escalation
  const lastAlertLevelRef = useRef(Object.fromEntries(ALL_IDS.map((id) => [id, 0])));

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
      message: `Player ${pid} has been at fatigue level ${level} for ${minutes} min while on field.`,
    });
  }

  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();

      for (const pid of ALL_IDS) {
        const lvl = levelsRef.current[pid];
        const onField = inFieldRef.current[pid];

        // If not on field or under 4, clear timers & allow future escalation to be fresh
        if (!onField || lvl < 4) {
          level4SinceRef.current[pid] = 0;
          level5SinceRef.current[pid] = 0;
          lastAlertLevelRef.current[pid] = 0;
          continue;
        }

        // track timers
        if (lvl >= 4) {
          if (!level4SinceRef.current[pid]) level4SinceRef.current[pid] = now;
        } else {
          level4SinceRef.current[pid] = 0;
        }

        if (lvl >= 5) {
          if (!level5SinceRef.current[pid]) level5SinceRef.current[pid] = now;
        } else {
          level5SinceRef.current[pid] = 0;
        }

        // Check level 5 first (higher severity)
        if (level5SinceRef.current[pid]) {
          const since5 = level5SinceRef.current[pid];
          const longEnough5 = now - since5 >= CRIT_5_HOLD_MS;
          const snoozed5 = now - (lastAlertAtRef.current[pid][5] || 0) >= ALERT_SNOOZE_MS;

          // if last alert was 4, allow a 5 even if snoozed5 is false
          const escalatedFrom4 = lastAlertLevelRef.current[pid] === 4;

          if (longEnough5 && (snoozed5 || escalatedFrom4)) {
            triggerAlert(pid, since5, now, 5);
            continue; // don't also send a 4 this tick
          }
        }

        // Then check level 4 (no escalation bypass here)
        if (level4SinceRef.current[pid]) {
          const since4 = level4SinceRef.current[pid];
          const longEnough4 = now - since4 >= CRIT_4_HOLD_MS;
          const snoozed4 = now - (lastAlertAtRef.current[pid][4] || 0) >= ALERT_SNOOZE_MS;

          if (longEnough4 && snoozed4) {
            triggerAlert(pid, since4, now, 4);
          }
        }
      }
    }, ALERT_SCAN_MS);

    return () => clearInterval(id);
  }, []);

  /* layout helpers */
  const rowXFit = (n, minX = 50, maxX = 750) => {
    if (n <= 1) return [(minX + maxX) / 2];
    const gap = (maxX - minX) / (n - 1);
    return Array.from({ length: n }, (_, i) => minX + i * gap);
  };

  const renderPlayersRow = (ids, y) => {
    const xs = rowXFit(ids.length);
    return ids.map((pid, i) => (
      <g key={pid}>
        <circle
          cx={xs[i]}
          cy={y}
          r={22}
          fill={FAT_COLORS[levels[pid]]}
          stroke="#fff"
          strokeWidth="2"
        />
        <text x={xs[i]} y={y + 5} textAnchor="middle" fontWeight="bold" fill="#1b1b1b">
          {pid}
        </text>
      </g>
    ));
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />

      {/* Single toast that adapts to level */}
      <MDSnackbar
        color={alert.level === 5 ? "error" : "warning"}
        icon={alert.level === 5 ? "error" : "warning"}
        title="Fatigue Alert"
        content={
          alert.pid
            ? `Player ${alert.pid} has been at fatigue level ${alert.level} for ${alert.minutes} min. Consider a substitution.`
            : ""
        }
        dateTime=""
        open={alert.open}
        onClose={() => setAlert((a) => ({ ...a, open: false }))}
        close={() => setAlert((a) => ({ ...a, open: false }))}
        bgWhite
      />

      <MDBox py={3} display="flex" justifyContent="center" alignItems="flex-start">
        <MDBox
          sx={{
            background: "#1E7A3C",
            borderRadius: "16px",
            boxShadow: 3,
            p: 3,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minWidth: 820,
            minHeight: 540,
            marginRight: 4,
          }}
        >
          <svg width={800} height={500}>
            <text x={400} y={30} textAnchor="middle" fontSize={20} fill="#fff" fontWeight="bold">
              PACIFIC U — NCAA DASHBOARD
            </text>

            {/* vertical dashed grid */}
            {Array.from({ length: 19 }, (_, i) => {
              const x = 30 + i * 40;
              return (
                <line
                  key={x}
                  x1={x}
                  y1={20}
                  x2={x}
                  y2={500}
                  stroke="#fff"
                  strokeDasharray="8,8"
                  strokeWidth={2}
                  opacity={0.25}
                />
              );
            })}

            {/* rows: Active (top), Replacement (2nd), Rotation (3rd & 4th) */}
            {renderPlayersRow(groups.active, 120)}
            {renderPlayersRow(groups.replacement, 220)}
            {renderPlayersRow(groups.rotation.slice(0, Math.ceil(groups.rotation.length / 2)), 320)}
            {renderPlayersRow(groups.rotation.slice(Math.ceil(groups.rotation.length / 2)), 390)}
          </svg>
        </MDBox>

        {/* legend */}
        <TableContainer component={Paper} sx={{ maxWidth: 300, marginTop: 15 }}>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell colSpan={2} align="center" sx={{ fontWeight: "bold", fontSize: 18 }}>
                  Fatigue Levels
                </TableCell>
              </TableRow>
              {Object.entries(FAT_LABELS).map(([level, label]) => (
                <TableRow key={level}>
                  <TableCell>
                    <span
                      style={{
                        display: "inline-block",
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        background: FAT_COLORS[level],
                        border: "2px solid #fff",
                        marginRight: 8,
                        verticalAlign: "middle",
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>{label}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </MDBox>

      <Footer />
    </DashboardLayout>
  );
}

NcaaDashboard.propTypes = { refreshSeconds: PropTypes.number };
NcaaDashboard.defaultProps = { refreshSeconds: 1200 };
