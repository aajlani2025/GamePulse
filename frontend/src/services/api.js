import axios from "axios";
import authService from "./authService";

// Use an env-driven base URL when provided (REACT_APP_API_URL), otherwise
// default to a relative URL so the app works in same-origin deployments or when
// proxied in development.
const baseURL = process.env.REACT_APP_API_URL || "";

const api = axios.create({
  baseURL,
  withCredentials: true,
});

let isRefreshing = false;
let refreshQueue = [];

function processQueue(error, token = null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  refreshQueue = [];
}

api.interceptors.request.use((config) => {
  const token = authService.getAccessToken();
  if (token) config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;
    const status = err?.response?.status;

    // Don't attempt a refresh for auth endpoints (login/refresh/logout) —
    // let those requests surface errors to the caller so the UI can show them.
    // Combine baseURL+url to robustly detect auth endpoints whether the request is absolute or relative.
    const requestUrl = (originalRequest?.baseURL || "") + (originalRequest?.url || "");
    const isAuthEndpoint = ["/auth/login", "/auth/refresh", "/auth/logout"].some((p) =>
      requestUrl.includes(p)
    );

    // Only handle 401/403 for protected requests (avoid infinite loops)
    if ((status === 401 || status === 403) && !originalRequest._retry) {
      if (isAuthEndpoint) {
        // Do not try to refresh tokens for auth endpoints — return the error directly
        return Promise.reject(err);
      }
      if (isRefreshing) {
        // queue the request until the refresh finishes
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((e) => Promise.reject(e));
      }

      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const ok = await authService.callRefresh();
        isRefreshing = false;
        if (ok) {
          const newToken = authService.getAccessToken();
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } else {
          processQueue(new Error("refresh_failed"), null);
          await authService.callLogout();
          return Promise.reject(err);
        }
      } catch (e) {
        isRefreshing = false;
        processQueue(e, null);
        await authService.callLogout();
        return Promise.reject(e);
      }
    }

    return Promise.reject(err);
  }
);

export default api;
