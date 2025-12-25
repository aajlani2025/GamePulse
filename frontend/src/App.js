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
* Material Dashboard 2 React - v2.2.0
=========================================================
*/

import { useState, useEffect, useMemo } from "react";

// react-router components
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

import MDBox from "components/MDBox";

import Sidenav from "examples/Sidenav";

import theme from "assets/theme";
import themeRTL from "assets/theme/theme-rtl";

import themeDark from "assets/theme-dark";
import themeDarkRTL from "assets/theme-dark/theme-rtl";

import rtlPlugin from "stylis-plugin-rtl";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";

import routes from "routes";
import NotFound from "layouts/404";
import { useAuth } from "context/AuthContext";

import { useMaterialUIController, setMiniSidenav } from "context";

import { AlertsProvider } from "context/alerts";
import { AuthProvider } from "context/AuthContext";


export default function App() {
  const [controller, dispatch] = useMaterialUIController();
  const {
    miniSidenav,
    direction,
    layout,
    sidenavColor,
    transparentSidenav,
    whiteSidenav,
    darkMode,
  } = controller;
  const [onMouseEnter, setOnMouseEnter] = useState(false);
  const [rtlCache, setRtlCache] = useState(null);
  const { pathname } = useLocation();

  useMemo(() => {
    const cacheRtl = createCache({
      key: "rtl",
      stylisPlugins: [rtlPlugin],
    });

    setRtlCache(cacheRtl);
  }, []);

  const handleOnMouseEnter = () => {
    if (miniSidenav && !onMouseEnter) {
      setMiniSidenav(dispatch, false);
      setOnMouseEnter(true);
    }
  };

  const handleOnMouseLeave = () => {
    if (onMouseEnter) {
      setMiniSidenav(dispatch, true);
      setOnMouseEnter(false);
    }
  };

  useEffect(() => {
    document.body.setAttribute("dir", direction);
  }, [direction]);

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.scrollingElement.scrollTop = 0;
  }, [pathname]);

  const getRoutes = (allRoutes) =>
    allRoutes.map((route) => {
      if (route.collapse) {
        return getRoutes(route.collapse);
      }

      if (route.route) {
        return <Route exact path={route.route} element={route.component} key={route.key} />;
      }

      return null;
    });

  // Render the NotFound page for authenticated users, otherwise redirect to sign-in.
  // This component must be defined here so it runs inside the AuthProvider (when Routes render).
  function AuthBasedNotFound() {
    const { isAuthenticated, loading } = useAuth();

    // While auth is resolving, render nothing to avoid redirect flashes.
    if (loading) return null;

    return isAuthenticated ? <NotFound /> : <Navigate to="/authentication/sign-in" replace />;
  }

  // Redirect root "/" to the dashboard for authenticated users, otherwise to sign-in.
  function HomeRedirect() {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return null;
    return isAuthenticated ? (
      <Navigate to="/ncaa-dashboard" replace />
    ) : (
      <Navigate to="/authentication/sign-in" replace />
    );
  }

  return direction === "rtl" ? (
    <CacheProvider value={rtlCache}>
      <ThemeProvider theme={darkMode ? themeDarkRTL : themeRTL}>
        <CssBaseline />
        <AlertsProvider>
          <AuthProvider>
            {layout === "dashboard" && (
              <>
                <Sidenav
                  color={sidenavColor}
                  brandName="GamePulse"
                  routes={routes}
                  onMouseEnter={handleOnMouseEnter}
                  onMouseLeave={handleOnMouseLeave}
                />
              </>
            )}
            {layout === "vr"}
            <Routes>
              {getRoutes(routes)}
              <Route path="/" element={<HomeRedirect />} />
              <Route path="*" element={<AuthBasedNotFound />} />
            </Routes>
          </AuthProvider>
        </AlertsProvider>
      </ThemeProvider>
    </CacheProvider>
  ) : (
    <ThemeProvider theme={darkMode ? themeDark : theme}>
      <CssBaseline />
      <AlertsProvider>
        <AuthProvider>
          {layout === "dashboard" && (
            <>
              <Sidenav
                color={sidenavColor}
                brandName="GamePulse"
                routes={routes}
                onMouseEnter={handleOnMouseEnter}
                onMouseLeave={handleOnMouseLeave}
              />
            </>
          )}
          {layout === "vr"}
          <Routes>
            {getRoutes(routes)}
            <Route path="/" element={<HomeRedirect />} />
            <Route path="*" element={<AuthBasedNotFound />} />
          </Routes>
        </AuthProvider>
      </AlertsProvider>
    </ThemeProvider>
  );
}
