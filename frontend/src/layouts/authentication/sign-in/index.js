import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// @mui material components
import Card from "@mui/material/Card";


// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";

// Authentication layout components
import BasicLayout from "layouts/authentication/components/BasicLayout";
import { useAuth } from "context/AuthContext";
import authService from "services/authService";
import api from "services/api";
import getErrorMessage from "services/errorMessage";

function SignIn() {
  const navigate = useNavigate();
  const [rememberMe, setRememberMe] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { setAccessToken, setIsAuthenticated, setApproved } = useAuth();


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await api.post("/auth/login", { username, password });
      const data = res.data;
      if (!data?.accessToken) throw new Error("Login failed");
      // update React context
      setAccessToken(data.accessToken);
      setIsAuthenticated(true);
      // synchronously update the shared authService so axios interceptors and
      // other synchronous code will have the token immediately available.
      try {
        authService.setAccessToken(data.accessToken);
      } catch (e) {}
      // clear any previously cached approval state so RequireAuth/Approval
      // rely on fresh server-provided truth after login
      try {
        setApproved(null);
      } catch (e) {}

      // Immediately fetch authoritative /auth/me so we know whether to send
      // the user to the approval page or straight into the app.
      try {
        const me = await api.get("/auth/me");
        const isApproved = Boolean(me?.data?.approved);
        try {
          setApproved(isApproved);
        } catch (e) {}
        if (!isApproved) {
          navigate("/approval", { state: { from: { pathname: "/ncaa-dashboard" } } });
        } else {
          navigate("/ncaa-dashboard", { replace: true });
        }
      } catch (e) {
        // If /auth/me fails, fall back to navigating to approval so user cannot
        // access protected areas until we have authoritative state.
        try {
          setApproved(null);
        } catch (ee) {}
        navigate("/approval", { state: { from: { pathname: "/ncaa-dashboard" } } });
      }
    } catch (err) {
      console.error("Login error:", err);
      const msg = getErrorMessage(err, "Incorrect username or password.");
      setError(msg);
    }
  };

  return (
    <BasicLayout>
      <Card>
        <MDBox
          variant="gradient"
          bgColor="info"
          borderRadius="lg"
          coloredShadow="info"
          mx={2}
          mt={-3}
          p={2}
          mb={1}
          textAlign="center"
        >
          <MDTypography variant="h4" fontWeight="medium" color="white" mt={1}>
            Sign in
          </MDTypography>
        </MDBox>
        <MDBox pt={4} pb={3} px={3}>
          <MDBox component="form" role="form" onSubmit={handleSubmit}>
            <MDBox mb={2}>
              <MDInput
                type="text"
                label="Username"
                fullWidth
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </MDBox>
            <MDBox mb={2}>
              <MDInput
                type="password"
                label="Password"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </MDBox>
            <MDBox display="flex" alignItems="center" ml={-1}></MDBox>
            {error && (
              <MDBox mt={2}>
                <MDTypography color="error" variant="caption">
                  {error}
                </MDTypography>
              </MDBox>
            )}
            <MDBox mt={4} mb={1}>
              <MDButton variant="gradient" color="info" fullWidth type="submit">
                Sign in
              </MDButton>
            </MDBox>
          </MDBox>
        </MDBox>
      </Card>
    </BasicLayout>
  );
}

export default SignIn;
