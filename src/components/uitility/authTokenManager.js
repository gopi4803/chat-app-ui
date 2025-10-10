import {jwtDecode} from "jwt-decode"; 
import api, { setAccessToken, getAccessToken } from "./api";

let refreshTimeout = null;

export function scheduleTokenRefresh() {
  const accessToken = getAccessToken();
  if (!accessToken) return;

  try {
    const decoded = jwtDecode(accessToken);
    const exp = decoded.exp * 1000; // ms
    const now = Date.now();
    const buffer = 10 * 1000; // refresh 10s before expiry
    const delay = exp - now - buffer;

    if (delay <= 0) {
      // token already expired or about to expire, refresh now
      console.warn("Access token expired or about to expire; refreshing now");
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
  try {
    // api has withCredentials: true so browser will include refresh cookie
    const res = await api.post("/refresh-token", {});
    const { accessToken } = res.data;
    if (accessToken) {
      setAccessToken(accessToken);
      console.log("Access token refreshed proactively");
      scheduleTokenRefresh();
    } else {
      throw new Error("No accessToken returned on proactive refresh");
    }
  } catch (e) {
    console.error("Token refresh failed", e);
    setAccessToken(null);
    window.location.href = "/log-in";
  }
}
