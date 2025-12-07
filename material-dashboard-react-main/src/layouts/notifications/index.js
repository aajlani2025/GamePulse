/**
=========================================================
* Material Dashboard 2 React - v2.2.0
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-react
* Copyright 2023 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

/**
=========================================================
* Minimal Profile page
=========================================================
*/

// Fatigue notifications page
import React, { useEffect } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import { useAlerts } from "context/alerts";
import RequireAuth from "components/RequireAuth";
import { useAuth } from "context/AuthContext";
function Notifications() {
  const { alerts, addAlert, clearAlerts, removeAlert } = useAlerts();
  const { isAuthenticated, accessToken } = useAuth();

  const fmt = (iso) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  // SSE: listen for backend 'alert' events and add them to alerts context
  useEffect(() => {
    if (!isAuthenticated) return;

    let eventsUrl = "/events";
    if (process.env.REACT_APP_API_URL) {
      const base = process.env.REACT_APP_API_URL.replace(/\/$/, "");
      eventsUrl = `${base}/events`;
    }
    if (accessToken) {
      const sep = eventsUrl.includes("?") ? "&" : "?";
      eventsUrl = `${eventsUrl}${sep}access_token=${encodeURIComponent(accessToken)}`;
    }

    const es = new EventSource(eventsUrl);

    es.addEventListener("alert", (e) => {
      try {
        const data = JSON.parse(e.data || "{}");
        const pid = data.player_id || data.playerId || data.pid || "unknown";
        const triggered = data.received_at ?? new Date().toISOString();

        // Different alert shapes depending on type
        if (data.type === "missing_data") {
          addAlert({
            type: "missing_data",
            pid,
            player_id: data.player_id,
            source: data.source || "unknown",
            timestamp: data.timestamp ?? null,
            triggeredAt: triggered,
            message: `Missing data from ${data.source || "unknown"} for player ${pid}`,
          });
          return;
        }

        if (data.type === "delayed_data") {
          addAlert({
            type: "delayed_data",
            pid,
            player_id: data.player_id,
            delay_seconds: Number(data.delay_seconds) || 0,
            last_update: data.last_update ?? null,
            timestamp: data.timestamp ?? null,
            triggeredAt: triggered,
            message: `Delayed data (${data.delay_seconds ?? "?"}s) for player ${pid}`,
          });
          return;
        }

        // Default: treat as generic/fatigue alert (from in-app logic)
        const level = Number(data.level ?? data.fatigue_level ?? 0);
        const duration = Math.round(Number(data.durationMinutes ?? data.delay_seconds ?? 0));
        const started = data.startedAt ?? data.timestamp ?? new Date().toISOString();

        addAlert({
          type: "fatigue",
          pid,
          level,
          durationMinutes: duration,
          startedAt: started,
          triggeredAt: triggered,
          message: data.message ?? `Player ${pid} fatigue level ${level}`,
        });
      } catch (err) {
        // ignore malformed events
      }
    });

    es.onerror = (err) => {
      // keep simple: log and let ncaa-dashboard handle refresh logic elsewhere
      // a future improvement can mimic the refresh/reauth flow from ncaa-dashboard
      // console.error('[SSE error]', err);
    };

    return () => {
      try {
        es.close();
      } catch (e) {}
    };
  }, [isAuthenticated, accessToken, addAlert]);

  // Clear notifications when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      try {
        clearAlerts();
      } catch (e) {}
    }
  }, [isAuthenticated, clearAlerts]);

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox mt={6} mb={3}>
        <Grid container spacing={3} justifyContent="center">
          <Grid item xs={12} lg={10}>
            <Card>
              <MDBox p={2} display="flex" alignItems="center" justifyContent="space-between">
                <MDTypography variant="h5">Fatigue Notifications</MDTypography>
                {alerts.length > 0 && (
                  <MDButton color="error" variant="outlined" onClick={clearAlerts}>
                    Clear all
                  </MDButton>
                )}
              </MDBox>

              <MDBox px={2} pb={2}>
                {alerts.length === 0 ? (
                  <MDTypography variant="button" color="text">
                    No notifications yet.
                  </MDTypography>
                ) : (
                  alerts.map((a) => (
                    <MDBox
                      key={a.id}
                      py={1.25}
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
                    >
                      <MDBox>
                        {/* Render different alert types */}
                        {a.type === "missing_data" ? (
                          <>
                            <MDTypography variant="button" fontWeight="bold">
                              Missing data — Player {a.pid || a.player_id}
                            </MDTypography>
                            <MDTypography variant="caption" color="text" display="block">
                              Source: {a.source}
                            </MDTypography>
                            <MDTypography variant="caption" color="text">
                              Timestamp: {a.timestamp ? fmt(a.timestamp) : "unknown"} • Received:{" "}
                              {fmt(a.triggeredAt)}
                            </MDTypography>
                          </>
                        ) : a.type === "delayed_data" ? (
                          <>
                            <MDTypography variant="button" fontWeight="bold">
                              Delayed data — Player {a.pid || a.player_id}
                            </MDTypography>
                            <MDTypography variant="caption" color="text" display="block">
                              Delay: {a.delay_seconds ?? "?"} s
                            </MDTypography>
                            <MDTypography variant="caption" color="text">
                              Last update: {a.last_update ? fmt(a.last_update) : "unknown"} •
                              Received: {fmt(a.triggeredAt)}
                            </MDTypography>
                          </>
                        ) : (
                          <>
                            <MDTypography variant="button" fontWeight="bold">
                              Player {a.pid} — Level {a.level}
                            </MDTypography>
                            <MDTypography variant="caption" color="text" display="block">
                              {a.message}
                            </MDTypography>
                            <MDTypography variant="caption" color="text">
                              Started: {fmt(a.startedAt)} • Alerted: {fmt(a.triggeredAt)} •
                              Duration: {a.durationMinutes} min
                            </MDTypography>
                          </>
                        )}
                      </MDBox>

                      <MDButton
                        size="small"
                        color="secondary"
                        variant="text"
                        onClick={() => removeAlert(a.id)}
                      >
                        Dismiss
                      </MDButton>
                    </MDBox>
                  ))
                )}
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default function ProtectedNotifications() {
  return (
    <RequireAuth>
      <Notifications />
    </RequireAuth>
  );
}
