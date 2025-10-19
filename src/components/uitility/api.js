import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8080",
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // allow cookies to be sent/received
});

let inMemoryAccessToken = null;

export const setAccessToken = (token) => {
  inMemoryAccessToken = token;
};

export const getAccessToken = () => inMemoryAccessToken;

// Request interceptor attaches in-memory access token
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) config.headers["Authorization"] = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Don't retry /refresh-token endpoint
      if (originalRequest.url.includes("/refresh-token")) {
        setAccessToken(null);

        // Only redirect if NOT already on login OR reset-password page
        if (
          window.location.pathname !== "/log-in" &&
          !window.location.pathname.startsWith("/reset-password") &&
          window.location.pathname !== "/"
        ) {
          window.location.href = "/log-in";
        }
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(
          "http://localhost:8080/refresh-token",
          {},
          { withCredentials: true, headers: { "Content-Type": "application/json" } }
        );

        const { accessToken: newAccessToken } = res.data;
        if (!newAccessToken) throw new Error("No access token returned from refresh");

        setAccessToken(newAccessToken);
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error("Refresh token failed:", refreshError);
        setAccessToken(null);

        if (
          window.location.pathname !== "/log-in" &&
          !window.location.pathname.startsWith("/reset-password") &&
          window.location.pathname !== "/"
        ) {
          window.location.href = "/log-in";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
