/**
=========================================================
* Material Dashboard 2 React - Logout helper
=========================================================

*/
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "context/AuthContext";
import api from "services/api";

// @mui material components
import Card from "@mui/material/Card";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Authentication layout components
import BasicLayout from "layouts/authentication/components/BasicLayout";

function SignOut() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    let mounted = true;

    async function doLogout() {
      try {
        await api.post("/auth/logout");
      } catch (e) {
        // ignore network errors and clear client state anyway
        console.error("Logout request failed:", e);
      }

      // Clear client-side app state and storage (keep only currently used keys)
      try {
        localStorage.removeItem("ncaa_groups");
        localStorage.removeItem("ncaa_levels");
        sessionStorage.clear();
      } catch (e) {
        // ignore storage errors in some browsers
      }

      try {
        if (mounted) await logout();
      } catch (e) {}

      // Redirect back to sign-in immediately (SPA navigation)
      if (mounted) navigate("/authentication/sign-in", { replace: true });
    }
    // start logout flow
    doLogout();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  return (
    <BasicLayout>
      <Card>
        <MDBox p={3} textAlign="center">
          <MDTypography variant="h5" fontWeight="medium">
            Signing out
          </MDTypography>
          <MDTypography variant="button" color="text">
            You will be redirected to the sign-in page.
          </MDTypography>
        </MDBox>
      </Card>
    </BasicLayout>
  );
}

export default SignOut;
