import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCogs, faRocket, faSignOutAlt, faSignal, faFilter, faUserMd, faSpinner, faCheck, faSearch,faDownload } from "@fortawesome/free-solid-svg-icons";
import Papa from 'papaparse'; // Pour analyser le CSV
const getJsonFromLocalStorage = (key) => {
  const storedData = localStorage.getItem(key);
  try {
    return storedData ? JSON.parse(storedData) : null;
  } catch (e) {
    console.error(`Error parsing JSON from localStorage key: ${key}`, e);
    return null;
  }
};
const Extract = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [signals, setSignals] = useState(location.state?.signals || null);
  const [filename, setFilename] = useState("");
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(localStorage.getItem("preProcessingCompleted") === "true");
  const [extracted, setExtracted] = useState(localStorage.getItem("extractedCompleted") === "true");
  const [csvInfo, setCsvInfo] = useState(JSON.parse(localStorage.getItem("csvInfo")) || null); // Pour récupérer les informations CSV stockées
  const [allRows, setAllRows] = useState(getJsonFromLocalStorage("allraw") || []); // Utiliser la fonction getJsonFromLocalStorage

  const userName = localStorage.getItem("userName");

  useEffect(() => {
    if (location.state) {
      const { signals, fileName } = location.state;
      if (signals) {
        setSignals(signals);
      }
      if (fileName) {
        setFilename(fileName);
      }
    }
    console.log(filename)
    document.body.style.justifyContent = "flex-start";
    document.body.style.alignItems = "center";

    return () => {
      document.body.style.display = "";
      document.body.style.justifyContent = "";
      document.body.style.alignItems = "";
      document.body.style.height = "";
    };
  }, []);

  const handleLogout = () => {
    navigate("/login");
  };
  const handleDownloadClick = () => {
    if (csvInfo) {
      const csv = Papa.unparse(allRows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "extracted_data.csv";
      link.click();
    } else {
      alert("No data available for download.");
    }
  };

  const handleStartClick = async () => {
    if (!completed) {
      alert("Please complete the preprocessing first before starting the feature extraction.");
    } else if (extracted) {
      alert("Feature extraction is already completed.");
    } else {
      setExtracted(false); 
      setProcessing(true); 
  
      try {
        const response = await fetch("http://localhost:5000/auth/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file_path: `temp/${filename}` }),
        });
        const result = await response.json();
        if (response.ok) {
          setExtracted(true);
          localStorage.setItem("extractedCompleted", "true");
         
          const allRows = result.all_rows;
          setAllRows(allRows); // Stocker toutes les lignes dans l'état
          localStorage.setItem("allraw", allRows);
          const first15Rows = allRows.slice(0, 5);
          const csvData = {
            ...result.file_description,
            first_15_rows: first15Rows,
          };
          setCsvInfo(csvData);
        localStorage.setItem("csvInfo", JSON.stringify(csvData)); // Stocker les données dans localStorage

        } else {
          alert(`Error: ${result.error || "Unknown error"}`);
          setProcessing(false);
        }
      } catch (error) {
        console.error("Error during extraction:", error);
        alert("An error occurred during extraction.");
        setProcessing(false);
      }
    }
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
                <h2>Feature Extraction</h2>
              </div>
              <div className="signal-info">
                <p><strong>Sampling Frequency:</strong> {signals.sfreq} Hz</p>
                <p><strong>Number of Channels:</strong> {signals.nchan}</p>
                <p><strong>Highpass Frequency:</strong> {signals.highpass} Hz</p>
                <p><strong>Lowpass Frequency:</strong> {signals.lowpass} Hz</p>
              </div>
             <div className="description">
                <h3> <FontAwesomeIcon icon={faSearch} /> Description </h3>
                <p>This functionality extracts advanced features from preprocessed signal segments. For each segment:</p>
                <ul className="space-y-2">
                  <li className="flex items-center"><span className="text-blue-500 mr-2">✔</span> The data is normalized to ensure consistency.</li>
                  <li className="flex items-center"><span className="text-blue-500 mr-2">✔</span> Various indicators are computed, such as DFA analysis, SVD entropy, variance, and FFT frequencies.</li>
                  <li className="flex items-center"><span className="text-blue-500 mr-2">✔</span> The two best channels are selected based on their complexity and relevance.</li>
                  <li className="flex items-center"><span className="text-blue-500 mr-2">✔</span> The extracted features are saved in a CSV file for easy analysis and further processing.</li>
                </ul>
              </div>
              <div className="processing-buttons">
                {<button className="btn" disabled={extracted} onClick={handleStartClick}>
                  {processing ? (<><FontAwesomeIcon icon={faSpinner} spin /> please be patient, this may take a while</>) : extracted ? (<><FontAwesomeIcon icon={faCheck} /> Completed</>) : ("Start")}
                </button>}
              </div>
              {/* Affichage des informations CSV */}
              {csvInfo && (
  <div className="csv-info">
   <div>
  <h3 style={{ display: 'inline-block', marginRight: '30px' }}>CSV File Information</h3>
  <button 
    onClick={handleDownloadClick} 
    className="btn" 
    style={{ display: 'inline-block' }}
  >
    <FontAwesomeIcon icon={faDownload} />
  </button>
</div>
    
    <p><strong>Rows:</strong> {csvInfo.num_rows}</p>
    <p><strong>Columns:</strong> {csvInfo.num_columns}</p>
    <p>First 5 Rows:</p>
    <table>
  <thead>
    <tr>
      {/* Affichage des noms des colonnes */}
      {csvInfo.first_15_rows[0] && Object.keys(csvInfo.first_15_rows[0]).map((column, index) => (
        <th key={index}>{column}</th>
      ))}
    </tr>
  </thead>
  <tbody>
    {/* Affichage des lignes de données */}
    {csvInfo.first_15_rows?.map((row, index) => (
      <tr key={index}>
        {Object.entries(row).map(([key, value], idx) => (
          <td key={idx}>{value}</td>
        ))}
      </tr>
    ))}
  </tbody>
</table>

  </div>
)}

            </div>
          ) : (
            <p>Loading signal data...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Extract;
