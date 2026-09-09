import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCogs, faRocket, faSignOutAlt, faSignal, faFilter, faUserMd, faSpinner, faCheck, faSearch } from "@fortawesome/free-solid-svg-icons";

const PreProcessing = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [signals, setSignals] = useState(location.state?.signals || null);
  const [filename, setFilename] = useState("");
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false); // Ne plus utiliser localStorage pour l'état initial
  const userName = localStorage.getItem("userName");
  const[comp,setcomp]=useState(true);
  useEffect(() => {
    if (location.state) {
      const { signals, fileName } = location.state;
      if (signals) {
        setSignals(signals);
        localStorage.setItem("signals", JSON.stringify(signals));
      }
      if (fileName) {
        setFilename(fileName);
        localStorage.setItem("filename", fileName);
      }
    } else {
      // Récupérer depuis localStorage si location.state est vide
      const storedSignals = localStorage.getItem("signals");
      const storedFilename = localStorage.getItem("filename");
      if (storedSignals) setSignals(JSON.parse(storedSignals));
      if (storedFilename) setFilename(storedFilename);
    }

    // Synchroniser l'état `completed` avec localStorage au montage
    const isCompleted = localStorage.getItem("preProcessingCompleted") === "true";
    setCompleted(isCompleted);

    document.body.style.justifyContent = "flex-start";
    document.body.style.alignItems = "center";

    return () => {
      document.body.style.display = "";
      document.body.style.justifyContent = "";
      document.body.style.alignItems = "";
      document.body.style.height = "";
    };
  }, [location.state]);

  const handlePreProcessing = async () => {
    if (!signals) {
      alert("Aucun signal disponible");
      return;
    }
    if (!filename) {
      alert("Nom de fichier manquant");
      return;
    }

    setProcessing(true);
    setCompleted(false);

    try {
      const response = await fetch("http://localhost:5000/auth/preprocess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_path: `temp/${filename}` }),
      });

      const result = await response.json();
      if (response.ok) {
        localStorage.setItem("preProcessingCompleted", "true"); // Sauvegarde dans localStorage
        setCompleted(true); // Mettre à jour l'état immédiatement
      } else {
        alert(`Erreur: ${result.error || "Erreur inconnue"}`);
        setProcessing(false);
        setcomp(true)
      }
    } catch (error) {
      console.error("Erreur lors du prétraitement :", error);
      alert("Une erreur s'est produite");
      setProcessing(false);
    }
  };

  const handleLogout = () => {
    navigate("/login");
  };

  return (
    <div id="root" style={{ width: "100%", height: "100%" }}>
      <div className="dashboard">
        <div className="sidebar">
          <div className="logo-container" style={{ height: "75px", marginTop: "10px" }}>
            <img src="/images/epilepsia.png" alt="EpilepTrack Logo" className="logo" />
          </div>
          <h1>EpilepTrack</h1>
          <hr />
          <ul>
            <li style={{ marginBottom: "35px" }}>
              <div className="user-info">
                <FontAwesomeIcon icon={faUserMd} style={{ marginRight: "8px", color: "#1a5e7d" }} />
                <span style={{ fontWeight: "bold", fontSize: "16px" }}>Dr. {userName}</span>
              </div>
            </li>
            <hr />
            <li>
              <button onClick={() => navigate("/dashboard")}>
                <FontAwesomeIcon icon={faSignal} /> Signal
              </button>
            </li>
            <li>
              <button onClick={() => navigate("/preProcessing", { state: { signals, filename } })}>
                <FontAwesomeIcon icon={faCogs} /> Pre-Processing
              </button>
            </li>
            <li>
              <button onClick={() => navigate("/extract" , { state: { signals, filename  } })}> <FontAwesomeIcon icon={faFilter} /> Feature Extraction </button>
            </li>
            <li>
              <button onClick={() =>  navigate("/detect", { state: { signals, filename } })}> <FontAwesomeIcon icon={faRocket} /> Detection </button>
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
        <div className="main-contente">
          {signals ? (
            <div className="signals-section">
              <div className="signals-header">
                <h2>Pre-Processing Signals</h2>
              </div>
              <div className="signal-info">
                <p><strong>Sampling Frequency:</strong> {signals.sfreq} Hz</p>
                <p><strong>Number of Channels:</strong> {signals.nchan}</p>
                <p><strong>Highpass Frequency:</strong> {signals.highpass} Hz</p>
                <p><strong>Lowpass Frequency:</strong> {signals.lowpass} Hz</p>
              </div>
              <div className="description">
                <h3> <FontAwesomeIcon icon={faSearch} /> Description </h3>
                <ul className="space-y-2">
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-2">✔</span> Notch Filtering (50 Hz)
                  </li>
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-2">✔</span> Min-Max Normalization
                  </li>
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-2">✔</span> Segmentation (5s)
                  </li>
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-2">✔</span> Artifact Removal (ICA)
                  </li>
                  <li className="flex items-center">
                    <span className="text-blue-500 mr-2">✔</span> Save in `.fif` format
                  </li>
                </ul>
              </div>
              <div className="processing-buttons">
                <button onClick={handlePreProcessing} className="btn" disabled={processing || completed}>
                  {processing ? (
                    <><FontAwesomeIcon icon={faSpinner} spin /> please be patient, this may take a while</>
                  ) : comp && completed ? (
                    <><FontAwesomeIcon icon={faCheck} /> Completed</>
                  ) : (
                    "Start"
                  )}
                </button>
              </div>
            </div>
          ) : (
            <p>Loading signal data...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreProcessing;