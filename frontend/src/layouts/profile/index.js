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

//Exemple of a static profile page , will later be updated to a dynamic profile page
// this page is not currently linked to the sidenav , it will later be used when we add the user profile management feature

import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";

import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import RequireAuth from "components/RequireAuth";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

function Overview() {
  const profile = {
    fullName: "Alec M. Thompson",
    email: "alecthompson@mail.com",
    mobile: "(44) 123 1234 123",
    location: "USA",
    role: "Analyst",
    team: "Pacific U",
  };
  // eslint-disable-next-line react/prop-types
  const InfoRow = ({ label, value }) => (
    <Grid container spacing={1} alignItems="center" sx={{ py: 1 }}>
      <Grid item xs={5} md={3}>
        <MDTypography variant="button" color="text">
          {label}
        </MDTypography>
      </Grid>
      <Grid item xs={7} md={9}>
        <MDTypography variant="button" fontWeight="medium">
          {value || "—"}
        </MDTypography>
      </Grid>
    </Grid>
  );

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox mt={3} mb={3}>
        <Card>
          <MDBox p={3}>
            <MDTypography variant="h5" gutterBottom>
              Profile
            </MDTypography>
            <MDTypography variant="button" color="text">
              Basic information
            </MDTypography>
            <Divider sx={{ my: 2 }} />

            <InfoRow label="Full name" value={profile.fullName} />
            <InfoRow label="Email" value={profile.email} />
            <InfoRow label="Mobile" value={profile.mobile} />
            <InfoRow label="Location" value={profile.location} />
            <InfoRow label="Role" value={profile.role} />
            <InfoRow label="Team" value={profile.team} />
          </MDBox>
        </Card>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default function ProtectedProfile() {
  return (
    <RequireAuth>
      <Overview />
    </RequireAuth>
  );
}
