import { useSelector, useDispatch } from "react-redux";
import { Navigate } from "react-router-dom";
import { getAccessToken } from "../uitility/api";
import { useEffect, useState } from "react";
import { setEmailFromToken } from "../redux/authSlice";

const ProtectedRoute = ({ children }) => {
  const dispatch = useDispatch();
  const reduxToken = useSelector((state) => state.auth.token);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = reduxToken || getAccessToken();
    if (storedToken) {
      dispatch(setEmailFromToken(storedToken));
      setToken(storedToken);
    }
    setLoading(false);
  }, [reduxToken, dispatch]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-lg text-gray-700">
        Checking authentication...
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/log-in" replace />;
  }

  return children;
};

export default ProtectedRoute;
