// src/components/redux/store.js
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice"; // adjust path if different
import chatReducer from "../chat/chatSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
  },
});

export default store;
