import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "context/AuthContext";

export default function RequireAuth({ children }) {
  const { isAuthenticated, loading, approved } = useAuth();
  const location = useLocation();

  // While auth is initializing (attempting refresh), don't redirect. Show nothing
  // so that direct URL navigation can complete the background refresh request.
  if (loading) return null;

  // If authenticated, ensure the user has approved data collection
  if (isAuthenticated) {
    // If the user is already on the approval page, allow rendering immediately.
    // This handles the post-login flow where the app navigates to /approval but
    // the authoritative `approved` flag is still being fetched (approved === null).
    if (location.pathname === "/approval") return children;

    // Rely on the server-provided `approved` flag as the source of truth.
    if (approved === null) return null;
    if (approved === true) return children;

    // redirect to approval page, preserving the attempted URL
    return <Navigate to="/approval" state={{ from: location }} replace />;
  }

  // redirect to sign-in, preserving the attempted URL
  return <Navigate to="/authentication/sign-in" state={{ from: location }} replace />;
}
