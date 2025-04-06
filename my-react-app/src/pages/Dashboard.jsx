import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from "chart.js";

import "./Dashboard.css";

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const Dashboard = () => {
  const [userRecords, setUserRecords] = useState([]);
  const [columns, setColumns] = useState([]);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState("");
  const [points, setPoints] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [attribute, setAttribute] = useState("");
  const [totalCO2, setTotalCO2] = useState(0);
  const [averageCO2, setAverageCO2] = useState(0);

  const recordsPerPage = 10;
  const navigate = useNavigate();

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    setUsername(storedUsername || "");

    const fetchUserData = async () => {
      try {
        const res = await axios.post("http://localhost:5000/user", {
          username: storedUsername,
        });

        if (res.data.success && Array.isArray(res.data.data)) {
          const records = res.data.data;
          setUserRecords(records);
          setPoints(res.data.points || 0);

          const keySet = new Set();
          records.forEach((r) =>
            Object.keys(r.user_data || {}).forEach((k) => keySet.add(k))
          );

          keySet.delete("username");
          const allKeysArray = Array.from(keySet);

          if (!allKeysArray.includes("month")) allKeysArray.push("month");
          if (!allKeysArray.includes("year")) allKeysArray.push("year");
          if (!allKeysArray.includes("Predicted Footprint"))
            allKeysArray.push("Predicted Footprint");

          setColumns(allKeysArray);
          if (allKeysArray.length > 0) setAttribute(allKeysArray[0]);

          const total = records.reduce(
            (acc, rec) => acc + (parseFloat(rec.predicted_footprint) || 0),
            0
          );
          const avg = records.length ? total / records.length : 0;
          setTotalCO2(total.toFixed(2));
          setAverageCO2(avg.toFixed(2));
        } else {
          setError(res.data.message || "No data found");
        }
      } catch (err) {
        console.error("Error:", err);
        setError("Failed to fetch data.");
      }
    };

    if (storedUsername) fetchUserData();
    else setError("No username found.");
  }, []);

  const paginatedRecords = userRecords.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  const attributeChartData = {
    labels: [],
    datasets: [
      {
        label: attribute,
        data: [],
        backgroundColor: [
          "#16a34a",
          "#65a30d",
          "#f59e0b",
          "#ef4444",
          "#6366f1",
          "#0ea5e9",
        ],
        borderWidth: 1,
      },
    ],
  };

  if (userRecords.length && attribute) {
    const valueMap = {};
    userRecords.forEach((record) => {
      const val = record.user_data?.[attribute] || "Unknown";
      valueMap[val] = (valueMap[val] || 0) + 1;
    });
    attributeChartData.labels = Object.keys(valueMap);
    attributeChartData.datasets[0].data = Object.values(valueMap);
  }

  const monthlyData = {};
  userRecords.forEach((r) => {
    const label = `${r.month || "?"}/${r.year || "?"}`;
    monthlyData[label] =
      (monthlyData[label] || 0) + (parseFloat(r.predicted_footprint) || 0);
  });

  const barChartData = {
    labels: Object.keys(monthlyData),
    datasets: [
      {
        label: "Monthly CO₂ Emission",
        data: Object.values(monthlyData),
        backgroundColor: "#10b981",
      },
    ],
  };

  const totalPages = Math.ceil(userRecords.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h2>Dashboard</h2>
        <button onClick={() => navigate("/form")}>Fill Form</button>
        <button onClick={() => navigate("/history")}>View History</button>
        <button onClick={() => navigate("/dashboard")}>View Statistics</button>
        <button onClick={() => navigate("/points")}>View Points</button> 
      </div>

      <div className="main-content">
        <div className="header">
          <h1>Carbon Footprint Dashboard</h1>
          <div className="welcome">
            Welcome, {username} - Points: {points}
          </div>
        </div>

        <div className="metrics">
          <div className="metric-box">
            <p>Total CO₂ Emissions</p>
            <h2>{totalCO2}</h2>
          </div>
          <div className="metric-box">
            <p>Average CO₂ Emission</p>
            <h2>{averageCO2}</h2>
          </div>
          <div className="attribute-selector">
            <label>Select Attribute</label>
            <select
              value={attribute}
              onChange={(e) => setAttribute(e.target.value)}
            >
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="charts">
          <div className="chart-box">
            <h3>Donut Chart - {attribute}</h3>
            <Doughnut data={attributeChartData} />
          </div>
          <div className="chart-box">
            <h3>Monthly CO₂ Emissions</h3>
            <Bar data={barChartData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
