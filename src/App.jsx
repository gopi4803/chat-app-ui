// src/App.jsx
import "./App.css";
import { Route, Routes } from "react-router-dom";
import { Provider, useDispatch } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { useEffect, useState } from "react";

import store, { persistor } from "./components/redux/store";
import Login from "./components/auth/Login";
import SignUp from "./components/auth/SignUp";
import ForgotPassword from "./components/auth/ForgotPassword";
import Dashboard from "./components/home/Dashboard";
import IncorrectPage from "./components/auth/IncorrectPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import OAuth2RedirectHandler from "./components/uitility/OAuth2Handler";

import { refreshTokenCall } from "./components/uitility/authApi";
import { setAccessToken } from "./components/uitility/api";
import { scheduleTokenRefresh } from "./components/uitility/authTokenManager";
import ResetPassword from "./components/auth/ResetPassword";

// auth actions
import { setToken, setEmailFromToken } from "./components/redux/authSlice";

// NOTE: small wrapper component to use dispatch inside top-level effect
function AppLoader({ children }) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const res = await refreshTokenCall();
        const { accessToken } = res.data;
        if (accessToken) {
          // put token into in-memory axios instance
          setAccessToken(accessToken);

          // IMPORTANT: also persist into redux auth slice so Dashboard sees token/email
          dispatch(setToken(accessToken));
          dispatch(setEmailFromToken(accessToken));

          // schedule refresh loop
          scheduleTokenRefresh();
          console.log("Session restored successfully");
        } else {
          console.log("No valid session found — user must log in.");
        }
      } catch (err) {
        if (err.response?.status === 401) {
          console.log("No existing session — showing login page.");
        } else {
          console.error("Unexpected session restore error:", err);
        }
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, [dispatch]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-lg font-medium">
        Loading...
      </div>
    );

  return children;
}

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AppLoader>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="log-in" element={<Login />} />
            <Route path="sign-up" element={<SignUp />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="/oauth2/redirect" element={<OAuth2RedirectHandler />} />
            <Route path="reset-password" element={<ResetPassword />} />
            <Route
              path="dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<IncorrectPage />} />
          </Routes>
        </AppLoader>
      </PersistGate>
    </Provider>
  );
}

export default App;
