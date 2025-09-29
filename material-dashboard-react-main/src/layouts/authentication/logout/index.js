/**
=========================================================
* Material Dashboard 2 React - Logout helper
=========================================================

Simple sign-out page that clears any test auth flags and redirects
to the sign-in page.
*/
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// @mui material components
import Card from "@mui/material/Card";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

// Authentication layout components
import BasicLayout from "layouts/authentication/components/BasicLayout";

function SignOut() {
  const navigate = useNavigate();

  useEffect(() => {
    // Clear any fake/test auth tokens used during development
    try {
      localStorage.removeItem("fake_auth");
      localStorage.removeItem("auth_token");
      sessionStorage.clear();
    } catch (e) {
      // ignore storage errors in some browsers
    }

    // Redirect back to sign-in after a short delay so user sees feedback
    const t = setTimeout(() => navigate("/authentication/sign-in", { replace: true }), 600);
    return () => clearTimeout(t);
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
