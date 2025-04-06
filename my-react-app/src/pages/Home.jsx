import React from "react";
import "./Home.css";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  return (
    <div className="button-container">
      <h1 className="heading">India's Carbon Footprint Detector</h1>
      <button
        className="footprint-btn individual"
        onClick={() => navigate("/login")}
      >
        Individual Carbon Footprint
      </button>
    </div>
  );
}
