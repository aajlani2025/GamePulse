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
function Notifications() {
  const { alerts, clearAlerts, removeAlert } = useAlerts();

  const fmt = (iso) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

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
                        <MDTypography variant="button" fontWeight="bold">
                          Player {a.pid} — Level {a.level}
                        </MDTypography>
                        <MDTypography variant="caption" color="text" display="block">
                          {a.message}
                        </MDTypography>
                        <MDTypography variant="caption" color="text">
                          Started: {fmt(a.startedAt)} • Alerted: {fmt(a.triggeredAt)} • Duration:{" "}
                          {a.durationMinutes} min
                        </MDTypography>
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
