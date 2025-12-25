import React, { useState, useEffect, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import MDBox from "components/MDBox";
import MDSnackbar from "components/MDSnackbar";
import { Table, TableBody, TableCell, TableContainer, TableRow, Paper } from "@mui/material";

import { useAlerts } from "context/alerts";
import { useAuth } from "context/AuthContext";
import { useFatigueAlerts } from "hooks/useFatigueAlerts";

/* Colors and labels */
const FAT_COLORS = { 4: "#E14C4C", 3: "#F5A623", 2: "#4DC591", 1: "#B6F2C2" };
const FAT_LABELS = {
  4: "Sub (F4)",
  3: "Rest (F3)",
  2: "Play (F2)",
  1: "Play (F1)",
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

export default function NcaaDashboard() {
  // enable debug logging by setting localStorage.setItem('ncaa_debug','1') in browser
  const DEBUG = (() => {
    try {
      return localStorage.getItem("ncaa_debug") === "1";
    } catch (e) {
      return false;
    }
  })();
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
  }, [groups]); // index and in-field status

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

  // auth
  const { isAuthenticated, refresh, logout, accessToken } = useAuth();

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
    if (!isAuthenticated) return; // only subscribe when authenticated

    let eventsUrl = "/events";
    if (process.env.REACT_APP_API_URL) {
      // Remove trailing slash if present
      const base = process.env.REACT_APP_API_URL.replace(/\/$/, "");
      eventsUrl = `${base}/events`;
    }
    // If we have an access token, attach it as a query param so EventSource
    // connections (which cannot set Authorization headers) can still authenticate.
    // The backend accepts `access_token` in query string as a valid credential.
    if (accessToken) {
      const sep = eventsUrl.includes("?") ? "&" : "?";
      eventsUrl = `${eventsUrl}${sep}access_token=${encodeURIComponent(accessToken)}`;
    }
    const es = new EventSource(eventsUrl);

    //function to handle incoming data
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
      ); // tolerate misspelling
      if ([1, 2, 3, 4].includes(lvl)) {
        setLevels((prev) => ({ ...prev, [pid]: lvl }));
        // Keep the levelsRef in sync immediately
        try {
          levelsRef.current[pid] = lvl;
        } catch (e) {
          // defensive: ignore
        }
      }

      const rawX = metrics?.pos_x_yd ?? metrics?.pos_x;
      const rawY = metrics?.pos_y_yd ?? metrics?.pos_y;
      const x = rawX == null ? NaN : Number(rawX);
      const y = rawY == null ? NaN : Number(rawY);
      if (DEBUG) {
        // snapshot of relevant state for debugging
        console.debug("SSE event", { pid, lvl, x, y, metrics });
      }
      if (!Number.isFinite(x) || !Number.isFinite(y)) return; // ensure numbers

      const isInField = insideField(x, y);
      const isInBorder = insideBorder(x, y);
      const target = isInField ? "active" : isInBorder ? "replacement" : "rotation"; // determine target group

      if (posIndexRef.current[pid]?.group !== target) {
        movePidToGroup(pid, target);
      } // move if needed

      inFieldRef.current[pid] = isInField; // track in-field status

      // REMOVED: Immediate alert checks - let scanner handle all timing logic
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
    // If SSE errors (possibly due to auth), attempt one refresh and logout on failure
    let triedRefresh = false;
    es.onerror = (err) => {
      console.error("[SSE error]", err);
      if (!triedRefresh) {
        triedRefresh = true;
        (async () => {
          try {
            const ok = await refresh();
            if (!ok) {
              // refresh failed — force logout and close SSE
              try {
                await logout();
              } catch (e) {}
              try {
                es.close();
              } catch (e) {}
            }
          } catch (e) {
            try {
              await logout();
            } catch (ee) {}
            try {
              es.close();
            } catch (ee) {}
          }
        })();
      }
    };

    return () => es.close();
  }, [isAuthenticated]);

  // when user becomes unauthenticated, clear sensitive UI state and close SSE
  useEffect(() => {
    if (isAuthenticated) return;
    // reset groups and levels to defaults
    setGroups(generatePlayers());
    setLevels(Object.fromEntries(ALL_IDS.map((id) => [id, 1])));
    try {
      localStorage.removeItem("ncaa_groups");
      localStorage.removeItem("ncaa_levels");
    } catch {}
  }, [isAuthenticated]);

  // Use fatigue alerts hook
  const { alert, closeAlert } = useFatigueAlerts({
    playerIds: ALL_IDS,
    levelsRef,
    inFieldRef,
    addAlert,
    debug: DEBUG,
  });

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
        color={alert.level === 4 ? "error" : "warning"}
        icon={alert.level === 4 ? "error" : "warning"}
        title="Fatigue Alert"
        content={
          alert.pid
            ? `Player ${alert.pid} has been at fatigue level ${alert.level} for ${alert.minutes} min. Consider a substitution.`
            : ""
        }
        dateTime=""
        open={alert.open}
        onClose={closeAlert}
        close={closeAlert}
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
        <MDBox sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TableContainer component={Paper} sx={{ maxWidth: 300 }}>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={2} align="center" sx={{ fontWeight: "bold", fontSize: 18 }}>
                    Fatigue Levels
                  </TableCell>
                </TableRow>
                {Object.entries(FAT_LABELS)
                  .reverse()
                  .map(([level, label]) => (
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

          <TableContainer>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={2} align="center" sx={{ fontWeight: "bold", fontSize: 18 }}>
                    Coach advice
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <span
                      style={{
                        display: "inline-block",
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        background: "#B6F2C2",
                        border: "2px solid #fff",
                        marginRight: 8,
                        verticalAlign: "middle",
                      }}
                    />
                    <span
                      style={{
                        display: "inline-block",
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        background: "#4DC591",
                        border: "2px solid #fff",
                        marginRight: 8,
                        verticalAlign: "middle",
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Stay / Play</TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>
                    <span
                      style={{
                        display: "inline-block",
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        background: "#F6D66B",
                        border: "2px solid #fff",
                        marginRight: 8,
                        verticalAlign: "middle",
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Rest</TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>
                    <span
                      style={{
                        display: "inline-block",
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        background: "#F5A623",
                        border: "2px solid #fff",
                        marginRight: 8,
                        verticalAlign: "middle",
                      }}
                    />
                    <span
                      style={{
                        display: "inline-block",
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        background: "#E14C4C",
                        border: "2px solid #fff",
                        marginRight: 8,
                        verticalAlign: "middle",
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>Substitute</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </MDBox>
      </MDBox>

      <Footer />
    </DashboardLayout>
  );
}

NcaaDashboard.propTypes = { refreshSeconds: PropTypes.number };
NcaaDashboard.defaultProps = { refreshSeconds: 1200 };
