import React, { useState } from "react";
import axios from "axios";
import "./kafka.css";

const Kafka = () => {
  const [formData, setFormData] = useState({
    username: localStorage.getItem("username") || "",
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
  const [isPredicted, setIsPredicted] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);
    setIsPredicted(true);
    setReducingAttributes([]);
    setReducedAmount(null);
    setRecommendations([]);

    try {
      const response = await axios.post("http://127.0.0.1:5001/predict", {
        username: formData.username,
        user_data: formData,
      });

      setResult(response.data);
      setRecommendations(response.data.recommendations || []);

      const analysisResponse = await axios.get(
        `http://127.0.0.1:5001/analyze_reduction/${formData.username}`
      );

      setReducingAttributes(analysisResponse.data.reducing_attributes);
      setReducedAmount(analysisResponse.data.reduced_amount);
    } catch (error) {
      console.error("Error during prediction or analysis:", error);
      alert("Error occurred while processing your request. Please try again.");
    }
  };

  const handleReductionSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.get(
        `http://127.0.0.1:5001/analyze_reduction/${reductionUsername}`
      );
      setReducingAttributes(response.data.reducing_attributes);
      setReducedAmount(response.data.reduced_amount);
    } catch (error) {
      console.error("Error fetching reduction analysis:", error);
      alert(
        "Error occurred while fetching the reduction analysis. Please try again."
      );
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
    <div className="out emerald-50 ">
      <div className={`in ${isPredicted ? "after-predict" : "before-predict"}`}>
        <h1 className="text-3xl font-bold text-center text-green-800 mb-6">
          🌱 Carbon Footprint Detector
        </h1>

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="table-layout">
            <div className="form-row">
              <label>Username:</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>

            {Object.keys(formData).map(
              (key) =>
                key !== "username" && (
                  <div className="form-row" key={key}>
                    <label>{key}:</label>
                    {selectOptions[key] ? (
                      <select
                        name={key}
                        value={formData[key]}
                        onChange={handleChange}
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
                        required
                      />
                    )}
                  </div>
                )
            )}
          </div>

          <button type="submit">🌍 Predict Carbon Footprint</button>
        </form>

        {result && (
          <div className="p-6 rounded-md border border-green-300 mb-10">
            <h3 className="text-xl font-bold text-green-700 mb-2">
              Predicted Carbon Footprint:
            </h3>
            <p className="text-lg text-green-900 mb-4">
              {result.predicted_footprint}
            </p>
          </div>
        )}

        {recommendations?.length > 0 && (
          <div className="mt-6 box">
            <h4 className="font-semibold text-green-700 mb-1">
              🌟 Recommendations Based on Similar Users:
            </h4>
            <ul className="list-disc list-inside ml-4 mt-1">
              {recommendations.map((rec, idx) => (
                <li key={idx}>
                  {rec.attribute}:{" "}
                  <span className="text-purple-700">
                    {rec.count} similar users
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-10">
          {(reducingAttributes.length > 0 || reducedAmount !== null) && (
            <div className="mt-5 p-5 bg-green-100 border rounded-md shadow-md">
              <h3 className="text-lg font-bold text-green-800 mb-2">
                Carbon Footprint Reduction Summary:
              </h3>
              {reducedAmount !== null && (
                <p className="mb-2">
                  <strong>Total Reduction:</strong>{" "}
                  <span className="text-green-700">{reducedAmount}</span> units
                </p>
              )}
              {reducingAttributes.length > 0 && (
                <div className="box">
                  <strong>Top Contributing Factors:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1">
                    {reducingAttributes.map((attr, index) => {
                      const key = Object.keys(attr)[0];
                      const value = attr[key];
                      return (
                        <li key={index}>
                          {key}:{" "}
                          <span className="text-blue-600">{value} %</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Kafka;
