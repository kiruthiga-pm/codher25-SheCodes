import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/login", {
        email,
        password,
      });

      if (res.data.success) {
        localStorage.setItem("username", res.data.username); // ✅ Set username here
        navigate("/dashboard");
      } else {
        alert("Invalid credentials");
      }
    } catch (err) {
      alert("Login failed");
    }
  };

  return (
    <div className="form-container">
      <div className="w-full max-w-md p-8 bg-white shadow-lg rounded-2xl">
        <form onSubmit={handleLogin} className="form-box">
          <h2 className="form-heading">Login to Your Account</h2>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="green-input"
          />
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="green-input"
          />
          <button type="submit" className="green-button">
            Login
          </button>
        </form>

        <p className="mt-6 w-100 text-center text-gray-700">
          Not registered yet?{" "}
          <Link
            to="/register"
            className="text-green-700 font-medium underline hover:text-green-900"
          >
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
