import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Dashboard.css";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [userRecords, setUserRecords] = useState([]);
  const [columns, setColumns] = useState([]);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
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
          console.log("Full records ->", records);
          setUserRecords(records);

          const allKeysSet = new Set();
          records.forEach((record) => {
            Object.keys(record.user_data || {}).forEach((key) =>
              allKeysSet.add(key)
            );
          });

          allKeysSet.delete("username");
          const allKeysArray = Array.from(allKeysSet);

          // Only add if not already present
          if (!allKeysArray.includes("month")) allKeysArray.push("month");
          if (!allKeysArray.includes("year")) allKeysArray.push("year");
          if (!allKeysArray.includes("Predicted Footprint"))
            allKeysArray.push("Predicted Footprint");

          setColumns(allKeysArray);
        } else {
          setError(res.data.message || "No data found");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError("Failed to fetch your data.");
      }
    };

    if (storedUsername) {
      fetchUserData();
    } else {
      setError("No username found. Please log in again.");
    }
  }, []);

  const formatHeader = (key) => {
    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const totalPages = Math.ceil(userRecords.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const paginatedRecords = userRecords.slice(
    startIndex,
    startIndex + recordsPerPage
  );

  const goToPrev = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <div className="fullconnect min-h-screen bg-green-50">
      <nav className="navbar">
        <h1 className="text-2xl font-bold">Carbon Footprint Dashboard</h1>
        <div className="name">
          <div className="text-right px-10 py-2 text-green-800 font-medium">
            Welcome, {username}
          </div>
          <button
            className="bg-white text-green-700 px-4 py-2 rounded hover:bg-green-100 font-semibold"
            onClick={() => navigate("/form")}
          >
            Fill Form
          </button>
        </div>
      </nav>

      <div className="p-10 flex justify-center">
        <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-7xl overflow-auto">
          <h2 className="text-3xl font-bold text-green-800 mb-6 text-center">
            Your Carbon Footprint Submissions
          </h2>

          {error && <p className="text-red-500 text-center">{error}</p>}
          {!error && userRecords.length === 0 && (
            <p className="text-center text-gray-500">Loading your data...</p>
          )}

          {userRecords.length > 0 && (
            <div className="flex justify-center mb-4 gap-6 items-center">
              <button
                className="text-green-700 text-xl font-bold disabled:opacity-30"
                onClick={goToPrev}
                disabled={currentPage === 1}
              >
                ←
              </button>
              <span className="text-green-800 font-semibold">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="text-green-700 text-xl font-bold disabled:opacity-30"
                onClick={goToNext}
                disabled={currentPage === totalPages}
              >
                →
              </button>
            </div>
          )}

          {paginatedRecords.length > 0 && columns.length > 0 && (
            <div className="table-wrapper overflow-auto">
              <table className="custom-table table-auto border-collapse w-full text-sm">
                <thead>
                  <tr>
                    <th>#</th>
                    {columns.map((col) => (
                      <th key={col}>{formatHeader(col) || "???"}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((entry, index) => {
                    const data = entry.user_data || {};
                    return (
                      <tr key={index} className="even:bg-green-50">
                        <td className="border px-4 py-2">
                          {startIndex + index + 1}
                        </td>
                        {columns.map((col) => {
                          let value = "-";
                          if (col === "Predicted Footprint") {
                            value = entry.predicted_footprint || "-";
                          } else if (col === "month") {
                            value = entry.month || "-";
                          } else if (col === "year") {
                            value = entry.year || "-";
                          } else {
                            value = data[col] || "-";
                          }

                          return (
                            <td
                              key={col}
                              className={`border px-4 py-2 ${
                                col === "Predicted Footprint"
                                  ? "text-green-700 font-bold"
                                  : ""
                              }`}
                            >
                              {value}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
