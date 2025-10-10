import React from "react";
import { useNavigate } from "react-router-dom";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

export default function NotFound() {
  const navigate = useNavigate();

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
        Sorry, we couldn't find the page you're looking for.
      </MDTypography>

      <MDButton variant="gradient" color="info" onClick={() => navigate("/", { replace: true })}>
        Go Home
      </MDButton>
    </MDBox>
  );
}
