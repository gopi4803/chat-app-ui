import "./App.css";
import { Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { useEffect, useState } from "react";

import store from "./components/redux/store";
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

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const res = await refreshTokenCall();
        const { accessToken } = res.data;
        if (accessToken) {
          setAccessToken(accessToken);
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
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-lg font-medium">
        Loading...
      </div>
    );

  return (
    <Provider store={store}>
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
    </Provider>
  );
}

export default App;
