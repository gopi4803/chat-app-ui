import api from "./api";

export const login = (data) => api.post("/log-in", data);
export const signup = (data) => api.post("/sign-up", data);
export const refreshTokenCall = () => api.post("/refresh-token", {});
export const logoutApi = () => api.post("/log-out", {}); 
