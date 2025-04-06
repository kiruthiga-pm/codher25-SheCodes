import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./login.css";

const Register = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState(""); // ✅ NEW
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/register", {
        email,
        username, // ✅ Send username
        password,
      });

      if (res.data.success) {
        alert("Registered successfully");
        navigate("/login");
      } else {
        alert(res.data.message || "Registration failed");
      }
    } catch (err) {
      alert("Error during registration");
    }
  };

  return (
    <div className="form-container">
      <div className="w-full max-w-md p-8 bg-white shadow-lg rounded-2xl">
        <form onSubmit={handleRegister} className="form-box">
          <h2 className="form-heading">Register</h2>

          <input
            type="text"
            placeholder="Username" // ✅ New input field
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="green-input"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="green-input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="green-input"
          />
          <button type="submit" className="green-button">
            Register
          </button>
        </form>

        <p className="mt-6 w-100 text-center text-gray-700">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-green-700 font-medium underline hover:text-green-900"
          >
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
