import api from "./api";

export const login = (data) => api.post("/log-in", data);
export const signup = (data) => api.post("/sign-up", data);
export const refreshTokenCall = (data) => api.post("/refresh-token", data); 