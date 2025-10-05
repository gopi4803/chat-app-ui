import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  token: null,        
  refreshToken: null,
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
      state.token = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    logout: (state) => {
      state.token = null;
      state.refreshToken = null;
      localStorage.removeItem("accessToken"); 
      localStorage.removeItem("refreshToken");
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
  setPassword,
  setConfirmPassword,
  togglePasswordVisibility,
  setToken,
  logout,
  clearAuthForm,
} = authSlice.actions;

export default authSlice.reducer;
