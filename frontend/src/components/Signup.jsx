import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import '../styles.css';
const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:5000/auth/signup", {
        name,
        email,
        password,
      });
      if (response.status === 201) {
        navigate("/login");
      }
    } catch (err) {
      setError("User already exists");
    }
  };

  return (
    <div className="container">
     <div className="image-container"></div>

      <div className="content">
      <div className="logo-container" style={{ height: "75px" }}>
  <img src="/images/epilepsia.png" alt="EpilepTrack Logo" className="logo" />
</div>
        <h1>EpilepTrack</h1>
        <h4>Create an account to get started.</h4>
        <form onSubmit={handleSubmit}>
        <div className="input-group">
            <label htmlFor="email">User name</label>
            <input
              type="text"
              placeholder="User name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit">Signup</button>
        </form>
        <p>
          Already have an account?{" "}
          <Link to="/login" className="link">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;