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

// Response interceptor handles 401 -> tries refresh via cookie
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and this request hasn't been retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Use axios directly to avoid interceptors recursion
        const res = await axios.post(
          "http://localhost:8080/refresh-token",
          {},
          { withCredentials: true, headers: { "Content-Type": "application/json" } }
        );

        const { accessToken: newAccessToken } = res.data;
        if (!newAccessToken) throw new Error("No access token returned from refresh");

        // Update in-memory token and retry original request
        setAccessToken(newAccessToken);
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error("Refresh token failed:", refreshError);
        // Clear in-memory token and redirect to login
        setAccessToken(null);
        window.location.href = "/log-in";
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
