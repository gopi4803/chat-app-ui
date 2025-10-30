import { createSlice } from "@reduxjs/toolkit";
import { jwtDecode } from "jwt-decode";

const initialState = {
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  token: null,
  showPassword: {
    password: false,
    confirmPassword: false,
  },
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUserName: (state, action) => {
      state.username = action.payload;
    },
    setEmail: (state, action) => {
      state.email = action.payload;
    },
    setEmailFromToken: (state, action) => {
      try {
        const decoded = jwtDecode(action.payload);
        if (decoded?.sub) state.email = decoded.sub;
      } catch (e) {
        console.error("Failed to decode token in setEmailFromToken:", e);
      }
    },
    setPassword: (state, action) => {
      state.password = action.payload;
    },
    setConfirmPassword: (state, action) => {
      state.confirmPassword = action.payload;
    },
    togglePasswordVisibility: (state, action) => {
      const field = action.payload;
      state.showPassword[field] = !state.showPassword[field];
    },
    setToken: (state, action) => {
      state.token = action.payload;
    },
    logout: (state) => {
      state.token = null;
      state.username = "";
      state.email = "";
      state.password = "";
      state.confirmPassword = "";
      state.showPassword = { password: false, confirmPassword: false };
    },
    clearAuthForm: (state) => {
      state.username = "";
      state.email = "";
      state.password = "";
      state.confirmPassword = "";
      state.showPassword = {
        password: false,
        confirmPassword: false,
      };
    },
  },
});

export const {
  setUserName,
  setEmail,
  setEmailFromToken,
  setPassword,
  setConfirmPassword,
  togglePasswordVisibility,
  setToken,
  logout,
  clearAuthForm,
} = authSlice.actions;

export default authSlice.reducer;
