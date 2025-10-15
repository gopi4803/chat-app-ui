import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setToken, setEmail } from "../redux/authSlice";
import api, { setAccessToken } from "../uitility/api";
import { scheduleTokenRefresh } from "../uitility/authTokenManager";

const OAuth2RedirectHandler = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleOAuthRedirect = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const email = params.get("email");

        // exchange refresh cookie for an access token
        // api has withCredentials: true, so cookie will be sent automatically
        const res = await api.post("/refresh-token", {});
        const { accessToken } = res.data || {};

        if (accessToken) {
          setAccessToken(accessToken);

          dispatch(setToken(accessToken));
          if (email) dispatch(setEmail(email));
          scheduleTokenRefresh();

          // small delay to ensure all state is settled
          await new Promise((r) => setTimeout(r, 50));

          navigate("/dashboard", { replace: true });
          return;
        } else {
          console.warn("No access token from refresh-token on OAuth redirect");
          navigate("/log-in", { replace: true });
        }
      } catch (err) {
        console.error("OAuth redirect handling failed:", err);
        navigate("/log-in", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    handleOAuthRedirect();
  }, [dispatch, navigate]);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
      {loading ? <h2>Finalizing Google sign-in...</h2> : <h2>Redirecting...</h2>}
    </div>
  );
};

export default OAuth2RedirectHandler;
