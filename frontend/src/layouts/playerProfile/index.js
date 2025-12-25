import React, { useState, useEffect } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import RequireAuth from "components/RequireAuth";
import { useAuth } from "context/AuthContext";
import api from "services/api";

function PlayerProfile() {
  const { isAuthenticated } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch players from API
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchPlayers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get("/players");
        setPlayers(response.data || []);
      } catch (err) {
        console.error("Error fetching players:", err);
        setError("Failed to load players. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, [isAuthenticated]);

  const renderPlayerCard = (player) => (
    <Grid item xs={12} md={6} lg={4} key={player.id}>
      <Card sx={{ height: "100%" }}>
        <MDBox p={3}>
          <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <MDTypography variant="h5" fontWeight="medium">
              Position : {player.position}
            </MDTypography>
            <MDBox
              sx={{
                width: 50,
                height: 50,
                borderRadius: "50%",
                background: "linear-gradient(195deg, #49a3f1, #1A73E8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MDTypography variant="h4" color="white" fontWeight="bold">
                {player.jersey_number}
              </MDTypography>
            </MDBox>
          </MDBox>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <MDBox>
                <MDTypography variant="caption" color="text" fontWeight="regular">
                  HR Rest (Est)
                </MDTypography>
                <MDTypography variant="h6" fontWeight="medium">
                  {player.hr_rest_est} bpm
                </MDTypography>
              </MDBox>
            </Grid>

            <Grid item xs={6}>
              <MDBox>
                <MDTypography variant="caption" color="text" fontWeight="regular">
                  HR Max (Est)
                </MDTypography>
                <MDTypography variant="h6" fontWeight="medium">
                  {player.hr_max_est} bpm
                </MDTypography>
              </MDBox>
            </Grid>

            <Grid item xs={6}>
              <MDBox>
                <MDTypography variant="caption" color="text" fontWeight="regular">
                  Cardio Level
                </MDTypography>
                <MDTypography variant="h6" fontWeight="medium">
                  {player.cardio_level}
                </MDTypography>
              </MDBox>
            </Grid>

            <Grid item xs={6}></Grid>

            <Grid item xs={12}>
              <MDBox>
                <MDTypography variant="caption" color="text" fontWeight="regular">
                  Recovery Score
                </MDTypography>
                <MDBox display="flex" alignItems="center" mt={0.5}>
                  <MDBox
                    sx={{
                      width: "100%",
                      height: 8,
                      borderRadius: 1,
                      background: "#e0e0e0",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <MDBox
                      sx={{
                        width: `${player.recovery_score || 0}%`,
                        height: "100%",
                        background:
                          (player.recovery_score || 0) >= 80
                            ? "linear-gradient(195deg, #66BB6A, #43A047)"
                            : (player.recovery_score || 0) >= 60
                            ? "linear-gradient(195deg, #FFA726, #FB8C00)"
                            : "linear-gradient(195deg, #EF5350, #E53935)",
                        borderRadius: 1,
                      }}
                    />
                  </MDBox>
                  <MDTypography variant="h6" fontWeight="medium" ml={1}>
                    {player.recovery_score || 0}
                  </MDTypography>
                </MDBox>
              </MDBox>
            </Grid>
          </Grid>
        </MDBox>
      </Card>
    </Grid>
  );

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox mt={6} mb={3}>
        <Grid container spacing={3} justifyContent="center">
          <Grid item xs={12}>
            <MDBox mb={3}>
              <MDTypography variant="h4" fontWeight="medium">
                Player Profiles
              </MDTypography>
              <MDTypography variant="button" color="text">
                View detailed player metrics and performance data
              </MDTypography>
            </MDBox>
          </Grid>

          {loading && (
            <Grid item xs={12}>
              <MDTypography variant="button" color="text">
                Loading players...
              </MDTypography>
            </Grid>
          )}

          {error && (
            <Grid item xs={12}>
              <MDBox p={2} sx={{ background: "#ffebee", borderRadius: 1 }}>
                <MDTypography variant="button" color="error">
                  {error}
                </MDTypography>
              </MDBox>
            </Grid>
          )}

          {!loading && players.length === 0 && !error && (
            <Grid item xs={12}>
              <MDTypography variant="button" color="text">
                No players found.
              </MDTypography>
            </Grid>
          )}

          {players.map((player) => renderPlayerCard(player))}
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default function ProtectedPlayerProfile() {
  return (
    <RequireAuth>
      <PlayerProfile />
    </RequireAuth>
  );
}
