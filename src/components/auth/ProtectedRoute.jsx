import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { getAccessToken } from "../uitility/api";

const ProtectedRoute = ({ children }) => {
  const token = useSelector((state) => state.auth.token) || getAccessToken();
  if (!token) {
    return <Navigate to="/log-in" replace />;
  }
  return children;
};

export default ProtectedRoute;
