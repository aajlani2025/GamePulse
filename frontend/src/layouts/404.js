import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "context/AuthContext";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

export default function NotFound() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <MDBox
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="70vh"
      px={2}
      textAlign="center"
    >
      <MDTypography variant="h1" fontWeight="bold" gutterBottom>
        404
      </MDTypography>

      <MDTypography variant="h5" color="text">
        Page not found
      </MDTypography>

      <MDTypography variant="body2" color="text" mt={1} mb={3}>
        Sorry. The page could not be found.
      </MDTypography>

      <MDButton
        variant="gradient"
        color="info"
        onClick={() =>
          navigate(isAuthenticated ? "/ncaa-dashboard" : "/authentication/sign-in", {
            replace: true,
          })
        }
      >
        Go Home
      </MDButton>
    </MDBox>
  );
}
