import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const token = useSelector((state) => state.auth.token) || localStorage.getItem("accessToken");

  if (!token) {
    return <Navigate to="/log-in" replace />;
  }

  return children;
};

export default ProtectedRoute;
