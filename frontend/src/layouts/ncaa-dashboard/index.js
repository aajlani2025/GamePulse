import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import MDBox from "components/MDBox";
import { Table, TableBody, TableCell, TableContainer, TableRow, Paper } from "@mui/material";

NcaaDashboard.propTypes = {
  refreshSeconds: PropTypes.number,
};

NcaaDashboard.defaultProps = {
  refreshSeconds: 1200,
};

const FAT_COLORS = {
  1: "#B6F2C2", // Pleine énergie
  2: "#F6D66B", // Fatigue légère
  3: "#F5A623", // Fatigué
  4: "#E14C4C", // Overload physiologique
};
const FAT_LABELS = {
  1: "Full energy",
  2: "Light fatigue",
  3: "Tired",
  4: "Physiological overload",
};

const generatePlayers = () => {
  const allIds = Array.from({ length: 40 }, (_, i) => `P${i + 1}`);
  return {
    active: allIds.slice(0, 11),
    bench: allIds.slice(11, 22),
    rotation: allIds.slice(22),
  };
};
export default function NcaaDashboard({ refreshSeconds = 1200 }) {
  const [players, setPlayers] = useState(() => {
    const { active, bench, rotation } = generatePlayers();
    const all = [...active, ...bench, ...rotation];
    const state = {};
    all.forEach((pid) => {
      state[pid] = Math.floor(Math.random() * 4) + 1; // 1 à 4
    });
    return {
      ...state,
      active: generatePlayers().active,
      bench: generatePlayers().bench,
      rotation: generatePlayers().rotation,
    };
  });

  // --- SSE pour P1 ---
  useEffect(() => {
    const eventSource = new EventSource("https://6b7429b5b0e9.ngrok-free.app/events");
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received SSE:", data);
        // Supposons que data = { p1: 2 } ou { p1: 3 }
        if (typeof data.p1 === "number" && data.p1 >= 1 && data.p1 <= 4) {
          setPlayers((prev) => ({
            ...prev,
            P1: data.p1,
          }));
        }
      } catch (e) {
        // ignore parse errors
      }
    };
    return () => {
      eventSource.close();
    };
  }, []);

  // --- Animation auto pour les autres joueurs ---
  useEffect(() => {
    const interval = setInterval(() => {
      setPlayers((prev) => {
        const newState = { ...prev };
        prev.active.forEach((pid) => {
          if (pid === "P1") return; // P1 est géré par SSE
          const delta = Math.random() < 0.65 ? 1 : Math.random() < 0.5 ? 0 : -1;
          newState[pid] = Math.min(4, Math.max(1, prev[pid] + delta));
        });
        prev.bench.forEach((pid) => {
          newState[pid] = 1;
        });
        prev.rotation.forEach((pid) => {
          newState[pid] = 1;
        });
        return newState;
      });
    }, refreshSeconds);
    return () => clearInterval(interval);
  }, [refreshSeconds]);

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
          fill={FAT_COLORS[players[pid]]}
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
      <DashboardNavbar isMini />
      <MDBox py={3} display="flex" justifyContent="center" alignItems="flex-start">
        {/* Zone de visualisation */}
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
            {/* Lignes verticales pointillées */}
            {Array.from({ length: 19 }, (_, i) => {
              const x = 40 + i * 40; // 40px d'écart, commence à 40
              return (
                <line
                  key={x}
                  x1={x}
                  y1={80}
                  x2={x}
                  y2={470}
                  stroke="#fff"
                  strokeDasharray="8,8"
                  strokeWidth={2}
                  opacity={0.25}
                />
              );
            })}
            {/* Cercles des joueurs */}
            {renderPlayersRow(players.active, 150)}
            {renderPlayersRow(players.bench, 250)}
            {renderPlayersRow(
              players.rotation.slice(0, Math.ceil(players.rotation.length / 2)),
              350
            )}
            {renderPlayersRow(players.rotation.slice(Math.ceil(players.rotation.length / 2)), 420)}
          </svg>
        </MDBox>
        {/* Table des niveaux de fatigue */}
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
                    ></span>
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
