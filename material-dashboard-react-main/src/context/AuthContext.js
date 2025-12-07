import React, { createContext, useContext, useState, useEffect } from "react";
import authService from "services/authService";
import api from "services/api";
import { useAlerts } from "context/alerts";

const AuthContext = createContext(null);
// eslint-disable-next-line react/prop-types
export function AuthProvider({ children }) {
  const { clearAlerts } = useAlerts();
  const [accessToken, setAccessToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [approved, setApproved] = useState(null);
  const [loading, setLoading] = useState(true);

  // Keep isAuthenticated in sync with accessToken
  useEffect(() => {
    setIsAuthenticated(Boolean(accessToken));
    // keep the shared authService in sync for the HTTP layer
    try {
      authService.setAccessToken(accessToken);
    } catch (e) {
      // noop
    }
  }, [accessToken]);

  // On mount, attempt to refresh access token using HttpOnly refresh cookie.
  useEffect(() => {
    let mounted = true;

    // Fetch /auth/me to get authoritative approval state
    async function fetchMe() {
      try {
        const resp = await api.get("/auth/me");
        if (resp && (resp.status === 200 || resp.status === 201)) {
          setApproved(Boolean(resp.data?.approved));
        } else {
          setApproved(false);
        }
      } catch (e) {
        // leave approved as null  so RequireAuth can fallback to localStorage
        console.error("fetch /auth/me failed:", e);
        setApproved(null);
      }
    }

    async function tryRefresh() {
      try {
        // use axios instance so the HTTP layer is consistent
        const res = await api.post("/auth/refresh");

        if (!mounted) return;

        if (res.status === 200 || res.status === 201) {
          const data = res.data;
          if (data?.accessToken) {
            setAccessToken(data.accessToken);
            setIsAuthenticated(true);
            try {
              authService.setAccessToken(data.accessToken);
            } catch (e) {}
            // After obtaining an access token, fetch authoritative /auth/me
            await fetchMe();
          }
        } else {
          setAccessToken(null);
          setIsAuthenticated(false);
          setApproved(null);
        }
      } catch (e) {
        // network errors or other issues: remain unauthenticated
        console.error("Auth refresh failed:", e);
        setAccessToken(null);
        setIsAuthenticated(false);
        setApproved(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    tryRefresh();
    authService.setRefreshHandler(tryRefresh);
    authService.setLogoutHandler(async () => {
      try {
        await api.post("/auth/logout");
      } catch (e) {}
      setAccessToken(null);
      setIsAuthenticated(false);
      // Ensure approval state is cleared on any logout path (including non-UI triggers)
      try {
        setApproved(null);
      } catch (e) {}
      try {
        authService.clearLocalData();
      } catch (e) {}
      try {
        clearAlerts();
      } catch (e) {}
    });

    return () => {
      mounted = false;
    };
  }, []);

  const value = {
    accessToken,
    setAccessToken,
    approved,
    setApproved,
    // refresh: returns true when refresh succeeded
    refresh: async () => {
      try {
        const resp = await api.post("/auth/refresh");
        if (resp.status === 200 || resp.status === 201) {
          const data = resp.data;
          if (data?.accessToken) {
            setAccessToken(data.accessToken);
            setIsAuthenticated(true);
            try {
              authService.setAccessToken(data.accessToken);
            } catch (e) {}
            // fetch authoritative approval state
            try {
              const me = await api.get("/auth/me");
              setApproved(Boolean(me.data?.approved));
            } catch (e) {
              setApproved(null);
            }
            return true;
          }
        }
      } catch (e) {}
      setAccessToken(null);
      setIsAuthenticated(false);
      setApproved(null);
      return false;
    },
    logout: async () => {
      try {
        await api.post("/auth/logout");
      } catch (e) {}
      setAccessToken(null);
      setIsAuthenticated(false);
      setApproved(null);
      try {
        authService.clearLocalData();
      } catch (e) {}
      try {
        clearAlerts();
      } catch (e) {}
    },
    isAuthenticated,
    setIsAuthenticated,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default AuthContext;
