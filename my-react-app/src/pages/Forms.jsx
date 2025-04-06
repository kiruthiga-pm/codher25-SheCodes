import React, { useState } from "react";
import axios from "axios";
import "./Forms.css";

const Form = () => {
  const [formData, setFormData] = useState({
    username: "",
    "Body Type": "",
    Sex: "",
    Diet: "",
    "How Often Shower": "",
    "Heating Energy Source": "",
    Transport: "",
    "Vehicle Type": "",
    "Social Activity": "",
    "Monthly Grocery Bill": "",
    "Frequency of Traveling by Air": "",
    "Vehicle Monthly Distance Km": "",
    "Waste Bag Size": "",
    "Waste Bag Weekly Count": "",
    "How Long TV PC Daily Hour": "",
    "How Many New Clothes Monthly": "",
    "How Long Internet Daily Hour": "",
    "Energy efficiency": "",
    Recycling: "",
    Cooking_With: "",
  });

  const [result, setResult] = useState(null);
  const [reductionUsername, setReductionUsername] = useState("");
  const [reducingAttributes, setReducingAttributes] = useState([]);
  const [reducedAmount, setReducedAmount] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);
    setReducingAttributes([]);
    setReducedAmount(null);
    setRecommendations([]);

    try {
      const response = await axios.post("http://127.0.0.1:5001/predict", {
        username: formData.username,
        user_data: formData,
      });

      setResult(response.data);
      const reductionData = response.data.reduction_data_for_keerthi;

      if (reductionData && typeof reductionData === "object") {
        setReducingAttributes(reductionData.reducing_attributes || []);
        setReducedAmount(reductionData.reduced_amount || 0);
      }
    } catch (error) {
      console.error("Error during prediction or analysis:", error);
    }
  };

  const handleReductionSubmit = async (e) => {
    e.preventDefault();
    setReducingAttributes([]);
    setReducedAmount(null);
    setRecommendations([]);
    try {
      const response = await axios.get(
        `http://127.0.0.1:5001/analyze_reduction/${reductionUsername}`
      );
      setReducingAttributes(response.data.reducing_attributes || []);
      setReducedAmount(response.data.reduced_amount || 0);
      setRecommendations(response.data.recommendations || []);
    } catch (error) {
      console.error("Error analyzing reduction attributes:", error);
    }
  };

  const selectOptions = {
    "Body Type": ["Underweight", "Normal", "Overweight", "Obese"],
    Sex: ["Male", "Female"],
    Diet: ["Vegan", "Vegetarian", "Non-Vegetarian"],
    "How Often Shower": ["Daily", "Weekly", "Occasionally"],
    "Heating Energy Source": ["Electric", "Gas", "Wood"],
    Transport: ["Public", "Private", "Bicycle", "Walking"],
    "Vehicle Type": ["Petrol", "Diesel", "Electric", "Hybrid"],
    "Social Activity": ["Rarely", "Often", "Very Often"],
    "Frequency of Traveling by Air": ["Never", "Occasionally", "Frequently"],
    "Waste Bag Size": ["Small", "Medium", "Large"],
    "Energy efficiency": ["Yes", "No"],
    Recycling: ["Paper", "Plastic", "Both", "None"],
    Cooking_With: ["Oven", "Stove", "Microwave"],
  };

  return (
    <div className="out">
      <h1 className="heading">
        🌱 <span className="">Carbon Footprint Detector</span>
      </h1>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Username:</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="form-input"
            placeholder="Enter your username"
            required
          />
        </div>

        {/* Dynamic Fields */}
        {Object.keys(formData).map(
          (key) =>
            key !== "username" && (
              <div key={key} className="form-group">
                <label className="form-label">{key}:</label>
                {selectOptions[key] ? (
                  <select
                    name={key}
                    value={formData[key]}
                    onChange={handleChange}
                    className="form-input"
                    required
                  >
                    <option value="">Select {key}</option>
                    {selectOptions[key].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    name={key}
                    value={formData[key]}
                    onChange={handleChange}
                    className="form-input"
                    placeholder={`Enter ${key}`}
                    required
                  />
                )}
              </div>
            )
        )}

        <div className="form-group">
          <button type="submit" className="submit-btn">
            🌍 Predict Carbon Footprint
          </button>
        </div>
      </form>

      {/* Result Section */}
      {result && (
        <div className="result-box">
          <h3 className="result-title">Predicted Carbon Footprint:</h3>
          <p className="result-value">{result.predicted_footprint}</p>

          {reducedAmount !== null && (
            <div>
              <h4>Keerthi’s Reduction Summary:</h4>
              <p>
                <strong>Total Reduction:</strong>{" "}
                <span>{reducedAmount}</span> units
              </p>

              {reducingAttributes.length > 0 && (
                <>
                  <strong>Top Contributing Factors:</strong>
                  <ul className="result-list">
                    {reducingAttributes.map((attr, index) => {
                      const key = Object.keys(attr)[0];
                      const value = attr[key];
                      return (
                        <li key={index}>
                          {key}: <span>{value}</span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Reduction Analysis Form */}
      <div className="reduction-form">
        <form onSubmit={handleReductionSubmit} className="reduction-form-submit">
          <input
            type="text"
            placeholder="Enter Username for Analysis"
            value={reductionUsername}
            onChange={(e) => setReductionUsername(e.target.value)}
            className="reduction-input"
          />
          <button
            type="submit"
            className="reduction-btn"
          >
            🔍 Analyze Reductions
          </button>
        </form>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="recommendations">
          <h3>Recommendations to Reduce Carbon Footprint:</h3>
          <ul>
            {recommendations.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Form;
