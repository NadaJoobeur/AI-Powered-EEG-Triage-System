import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Plot from "react-plotly.js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCogs,
  faRocket,
  faSignOutAlt,
  faUpload,
  faUser, faSignal, faFilter, faUserMd,
} from "@fortawesome/free-solid-svg-icons";
import Chatbot from "./chatbot"; 

const Dashboard = () => {
  const [file, setFile] = useState(null);
  const [signals, setSignals] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName'); // Récupérez le nom de l'utilisateur
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const savedFileName = localStorage.getItem("uploadedFileName");
  const savedSignals = localStorage.getItem("signals");

  if (savedFileName && savedSignals) {
    setFile({ name: savedFileName });
    setSignals(JSON.parse(savedSignals));
  }
    document.body.style.justifyContent = "flex-start";
    document.body.style.alignItems = "center";

    return () => {
      document.body.style.display = "";
      document.body.style.justifyContent = "";
      document.body.style.alignItems = "";
      document.body.style.height = "";
    };

  }, []);

  // Gérer la sélection du fichier
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile || !selectedFile.name.endsWith(".edf")) {
      alert("Please upload a valid EDF file.");
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
  
    try {
      const response = await fetch("http://localhost:5000/auth/upload", {
        method: "POST",
        body: formData,
      });
  
      console.log("Response object:", response); 
  
      const text = await response.text();
      console.log("Raw response:", text); 
  
      if (!response.ok) {
        throw new Error(`Failed to upload file: ${text}`);
      }
  
      if (!text) {
        throw new Error("Empty response from server");
      }
  
      const data = JSON.parse(text); 
      console.log("Parsed JSON:", data);
  
      setFile(selectedFile);
      setSignals({
        times: data.times,
        data: data.data,
        channels: data.channels,
        sfreq: data.sfreq,
        nchan: data.nchan,
        highpass: data.highpass, 
        lowpass: data.lowpass,
      });
      localStorage.setItem("uploadedFileName", selectedFile.name);
      localStorage.setItem("signals", JSON.stringify({
        times: data.times,
        data: data.data,
        channels: data.channels,
        sfreq: data.sfreq,
        nchan: data.nchan,
        highpass: data.highpass, 
        lowpass: data.lowpass,
      }));
      localStorage.removeItem("preProcessingCompleted");
      localStorage.removeItem("extractedCompleted");

  
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Error uploading file. Please check console for details.");
    }
    finally {
      setLoading(false);
    }
  };
  
  const handleResetFile = () => {
    localStorage.removeItem("uploadedFileName");
    localStorage.removeItem("signals");
    localStorage.removeItem("csvInfo");
    localStorage.removeItem("allraw");
    setFile(null);
    setSignals(null);
  
    // Vérifier si fileInputRef.current existe avant d'essayer de modifier sa valeur
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  
  // Gérer la déconnexion
  const handleLogout = () => {
    localStorage.clear();
    localStorage.removeItem("uploadedFileName");
  localStorage.removeItem("signals");
    navigate("/login");
  };

  return (
    <div id="root" style={{ width: "100%", height: "100%" }}>
      <div className="dashboard">
        <div className="sidebar">
          <div className="logo-container" style={{ height: "75px", marginTop: '10px' }}>
            <img
              src="/images/epilepsia.png"
              alt="EpilepTrack Logo"
              className="logo"
            />
          </div>
          <h1>EpilepTrack</h1>
          <hr />
          <ul>
            <li style={{ marginBottom: '35px' }}>
              <div className="user-info">
                <FontAwesomeIcon icon={faUserMd} style={{ marginRight: '8px', color: '#1a5e7d' }} />
                <span style={{ fontWeight: 'bold', fontSize: '16px' }}>Dr. {userName}</span>
              </div>
            </li>
            <hr />
            <li>
              <button onClick={() => navigate("/dashboard")}> <FontAwesomeIcon icon={faSignal} /> Signal </button>
            </li>
            <li>
              <button onClick={() => navigate("/preProcessing", {       state: { signals, fileName: file ? file.name : null },})}> <FontAwesomeIcon icon={faCogs} /> Pre-Processing </button>
            </li>
            <li>
              <button onClick={() => navigate("/extract", {       state: { signals, fileName: file ? file.name : null },})}> <FontAwesomeIcon icon={faFilter} /> Feature Extraction </button>
            </li>
            <li>
              <button onClick={() =>  navigate("/detect", { state: { signals} })}> <FontAwesomeIcon icon={faRocket} /> Detection </button>
            </li>
          </ul>
          <ul style={{ marginTop: "195px" }}>
            <li>
              <div className="logout-container">
                <button onClick={handleLogout}> <FontAwesomeIcon icon={faSignOutAlt} /> Logout </button>
              </div>
            </li>
          </ul>
        </div>

        <div className="main-content">
          {!signals && (
            <div className="upload-section">
              <h2>Upload Your EDF File</h2>
              <p>Please upload your EDF file to start the analysis.</p>
              <input type="file" id="file-upload" accept=".edf" onChange={handleFileChange} ref={fileInputRef} />
              <label htmlFor="file-upload"> <FontAwesomeIcon icon={faUpload} /> Choose a file </label>
            </div>
          )}

          {signals && (
            <div className="signals-section">
              <div className="signals-header">
                <h2>Signal Information</h2>
                <button onClick={handleResetFile} className="change-file-btn">Change File</button>
              </div>
              
              <div className="signal-info">
                <p><strong>Sampling Frequency:</strong> {signals.sfreq} Hz</p>
                <p><strong>Number of Channels:</strong> {signals.nchan}</p>
                <p><strong>Highpass Frequency:</strong> {signals.highpass} Hz</p>
                <p><strong>Lowpass Frequency:</strong> {signals.lowpass} Hz</p>
              </div>
              <div className="chart-container">
                <Plot data={signals.channels.map((channel, index) => ({ x: signals.times, y: signals.data[index], type: "scatter", mode: "lines", line: { color: "#1a5e7d" }, name: channel }))} layout={{ title: "EEG Signals", xaxis: { title: "Time (s)" }, yaxis: { title: "Amplitude (µV)" }, showlegend: true, height: 500, margin: { l: 50, r: 50, b: 50, t: 50, pad: 4 }, hovermode: "x unified" }} config={{ responsive: true, scrollZoom: true }} />
              </div>
            </div>
          )}
        </div>
      </div>
      <Chatbot />
    </div>
  );
};

export default Dashboard;
