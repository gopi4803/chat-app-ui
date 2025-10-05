import { jwtDecode } from "jwt-decode";
import api from "./api";

let refreshTimeout;

export function scheduleTokenRefresh() {
  const accessToken = localStorage.getItem("accessToken");
  if (!accessToken) return;
  try {
    const decoded = jwtDecode(accessToken);
    const exp = decoded.exp * 1000; 
    const now = Date.now();
    const buffer = 10 * 1000;
    const delay = exp - now - buffer;
    if (delay <= 0) {
      console.warn("Access token already expired or too close to expiry");
      refreshAccessToken();
      return;
    }
    clearTimeout(refreshTimeout);
    refreshTimeout = setTimeout(() => {
      refreshAccessToken();
    }, delay);
    console.log(`Scheduled access token refresh in ${Math.round(delay / 1000)}s`);
  } catch (e) {
    console.error("Failed to decode access token", e);
  }
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return;
  try {
    const res = await api.post("/refresh-token", { refreshToken });
    const { accessToken, refreshToken: newRefreshToken } = res.data;
    if (accessToken) {
      localStorage.setItem("accessToken", accessToken);
      if (newRefreshToken) localStorage.setItem("refreshToken", newRefreshToken);
      console.log("Access token refreshed proactively");
      scheduleTokenRefresh();
    }
  } catch (e) {
    console.error("Token refresh failed", e);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.location.href = "/log-in";
  }
}
