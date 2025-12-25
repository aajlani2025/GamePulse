import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import { useAuth } from "context/AuthContext";
import api from "services/api";


export default function Approval() {
  const navigate = useNavigate();
  const location = useLocation();

  const [checked, setChecked] = useState(false);
  const { accessToken } = useAuth();
  const { setApproved } = useAuth();

  const from = (location.state && location.state.from) || { pathname: "/" };

  async function confirm() {
    if (!checked) return;

    try {
      // Server returns the actual approval status
      const response = await api.post("/auth/approval", { consent: true });
      const approved = Boolean(response?.data?.approved);
      if (approved) {
        setApproved(true);
        navigate(from.pathname || "/", { replace: true });
      } else {
        // server explicitly rejected consent
        alert("Your approval was not accepted by the server.");
      }
    } catch (e) {
      alert("Failed to save approval. Please try again.");
    }
  }

  return (
    <MDBox
      sx={{ position: "fixed", inset: 0, zIndex: 1400, backgroundColor: "background.default" }}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Card sx={{ maxWidth: 600, padding: 4, margin: 2 }}>
        <MDTypography variant="h5" fontWeight="bold" gutterBottom>
          Data Collection Approval
        </MDTypography>
        <MDTypography variant="body1" color="text">
          By confirming below, I acknowledge that I am aware the data collected by the sensors will
          be transmitted and stored in AISYNAPSEPULSE databases for processing and analysis. I also
          understand that this data will be handled in compliance with applicable security and
          privacy standards, including HIPAA, to ensure the protection and confidentiality of the
          information.
        </MDTypography>
        <MDBox mt={3}>
          <FormControlLabel
            control={<Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)} />}
            label="I have read and approve the data collection terms"
          />

          <MDBox display="flex" justifyContent="flex-end" mt={2}>
            <MDButton variant="contained" color="info" onClick={confirm} disabled={!checked}>
              Confirm
            </MDButton>
          </MDBox>
        </MDBox>
      </Card>
    </MDBox>
  );
}
