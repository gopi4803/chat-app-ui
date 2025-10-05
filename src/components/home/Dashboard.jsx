import { useEffect } from "react";
import api from "../uitility/api";

const Dashboard = () => {
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

  return <div>Dashboard Page</div>;
};

export default Dashboard;
