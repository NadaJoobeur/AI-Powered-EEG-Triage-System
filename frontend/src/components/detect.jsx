import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCogs, faRocket, faSignOutAlt, faSignal, faFilter, faUserMd, faSpinner, faSearch, faDownload } from "@fortawesome/free-solid-svg-icons";

const Detection = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [signals, setSignals] = useState(location.state?.signals || null);
  const [filename, setFilename] = useState("");
  const [selectedApproach, setSelectedApproach] = useState("ML");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false); // Gérer l'état de chargement
  const [completed, setCompleted] = useState(false); // Gérer l'état de la fin du processus
  const [responseMessage, setResponseMessage] = useState(""); // Ajouter un état pour la réponse du serveur
  const [extracted, setExtracted] = useState(localStorage.getItem("extractedCompleted") === "true");

  const userName = localStorage.getItem("userName");

  useEffect(() => {
    document.body.style.justifyContent = "flex-start";
    document.body.style.alignItems = "center";

    

    return () => {
      document.body.style.display = "";
      document.body.style.justifyContent = "";
      document.body.style.alignItems = "";
      document.body.style.height = "";
    };
  }, [selectedApproach]);

  const handleLogout = () => {
    navigate("/login");
  };

  const handleStartClick = async () => {
    if (!extracted) {
        alert("Please extract your features before starting the detection process.");
        return; // Stop further execution if features are not extracted
      }
    setLoading(true); // Début du chargement
    setCompleted(false); // Réinitialiser l'état de "Completed"
    setResponseMessage(""); // Réinitialiser la réponse précédente

    try {
      const response = await fetch("http://localhost:5000/auth/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_path: `temp/${filename}` }),
      });
      const result = await response.json();
      if (response.ok) {
        console.log(result);
        setResponseMessage(result.predictions || "Process completed successfully!"); // Enregistrer la réponse
        setCompleted(true); // Marquer comme terminé si la réponse est OK
      } else {
        alert(`Error: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error during extraction:", error);
      alert("An error occurred during extraction.");
    }
    setLoading(false); // Fin du chargement
  };

  // Fonction pour télécharger la réponse
  const handleDownload = () => {
    const dataToDownload = responseMessage;
    const blob = new Blob([dataToDownload], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "detection_result.txt";
    link.click();
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
              <button onClick={() => navigate("/extract", { state: { signals, filename } })}>
                <FontAwesomeIcon icon={faFilter} /> Feature Extraction
              </button>
            </li>
            <li>
              <button onClick={() => navigate("/detect", { state: { signals, filename } })}>
                <FontAwesomeIcon icon={faRocket} /> Detection
              </button>
            </li>
          </ul>
          <ul style={{ marginTop: "195px" }}>
            <li>
              <div className="logout-container">
                <button onClick={handleLogout}>
                  <FontAwesomeIcon icon={faSignOutAlt} /> Logout
                </button>
              </div>
            </li>
          </ul>
        </div>
        <div className="main-contente">
          <div className="signals-section">
            <div className="signals-header">
              <h2>Epileptic Detection</h2>
            </div>
            
            <div className="approach-selection">
              <label>
                <input
                  type="radio"
                  value="ML"
                  checked={selectedApproach === "ML"}
                  onChange={() => setSelectedApproach("ML")}
                />
                ML Approche
              </label>
              <label>
                <input
                  type="radio"
                  value="DL"
                  checked={selectedApproach === "DL"}
                  onChange={() => setSelectedApproach("DL")}
                />
                DL Approche
              </label>
            </div>

            <div className="approach-description">
  {selectedApproach === "ML" ? (
    <div className="description">
      <h3> <FontAwesomeIcon icon={faSearch} /> Description </h3>
      <p>This model uses a combination of several techniques to accurately predict results:</p>
      <ul className="space-y-2">
        <li className="flex items-center"><span className="text-blue-500 mr-2">✔</span> Missing values in the data are filled using the KNN imputation technique, based on the nearest neighbors.</li>
        <li className="flex items-center"><span className="text-blue-500 mr-2">✔</span> An over-sampling technique (SMOTE) is used to generate synthetic examples for the underrepresented class.</li>
        <li className="flex items-center"><span className="text-blue-500 mr-2">✔</span> Several machine learning models (like Random Forest, SVM, KNN, and MLP) are trained on the data.</li>
        <li className="flex items-center"><span className="text-blue-500 mr-2">✔</span> A final model combines the predictions from the individual models to provide a more accurate and reliable result.</li>
      </ul>
    </div>
  ) : (
    <div className="description">
      <h3> <FontAwesomeIcon icon={faSearch} /> Description </h3>
      <p>This approach utilizes ConvLSTM (Convolutional Long Short-Term Memory) to handle spatiotemporal data for epileptic detection:</p>
  <ul className="space-y-2">
    <li className="flex items-center"><span className="text-blue-500 mr-2">✔</span> ConvLSTM combines the benefits of convolutional layers for extracting spatial features with the temporal memory capabilities of LSTM for handling time-dependent data.</li>
    <li className="flex items-center"><span className="text-blue-500 mr-2">✔</span> This method allows the model to effectively capture both spatial correlations in the signal and temporal patterns, which are crucial for accurate epilepsy detection.</li>
    <li className="flex items-center"><span className="text-blue-500 mr-2">✔</span> The ConvLSTM network is trained on signal data to recognize complex patterns and anomalies in the temporal sequences.</li>
    <li className="flex items-center"><span className="text-blue-500 mr-2">✔</span> The output predictions are highly accurate due to the model's ability to integrate both spatial and temporal features in the signal data.</li>
  </ul>
    </div>
  )}
</div>

            <div className="processing-buttons">
  {/* Bouton de démarrage */}
  <button className="btn" onClick={handleStartClick} disabled={loading}>
    {loading ? (
      <span>
        <FontAwesomeIcon icon={faSpinner} spin /> please be patient, this may take a while
      </span>
    ) : completed ? (
      // Afficher le bouton de téléchargement uniquement après la fin du processus
      "Completed"
    ) : (
      "Start"
    )}
  </button>
  
  {/* Si le processus est terminé, afficher le bouton de téléchargement */}
  {completed && (
    <div className="download-button">
      <button onClick={handleDownload} className="btn">
        <FontAwesomeIcon icon={faDownload} /> Download Result
      </button>
    </div>
  )}
</div>






          
          
          </div>
        </div>
      </div>
    </div>
  );
};

export default Detection;
