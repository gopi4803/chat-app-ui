import { useEffect } from "react";
import api, { setAccessToken } from "../uitility/api";
import { logoutApi } from "../uitility/authApi";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/dashboard");
        console.log("Dashboard data:", res.data);
      } catch (err) {
        console.error("Error fetching dashboard endpoint:", err);
      }
    };
    fetchData();
  }, []);

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      setAccessToken(null);
      navigate("/log-in");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-2xl font-semibold mb-6">Dashboard Page</h1>
      <button
        onClick={handleLogout}
        className="px-4 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition-colors duration-200"
      >
        Logout
      </button>
    </div>
  );
};

export default Dashboard;
