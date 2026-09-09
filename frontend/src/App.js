import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Dashboard from "./components/dashboard"
import PreProcessing from "./components/preProcessing";
import Extract from "./components/extract";
import Detection from "./components/detect";
const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/PreProcessing" element={<PreProcessing />} />
        <Route path="/Extract" element={<Extract />} />
        <Route path="/detect" element={<Detection />} />

        <Route path="/" element={<Login />} />  {/* Route par défaut */}
      </Routes>
    </Router>
  );
};

export default App;