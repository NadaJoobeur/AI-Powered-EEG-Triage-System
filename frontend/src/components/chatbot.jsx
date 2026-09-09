import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane, faComments } from "@fortawesome/free-solid-svg-icons";

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");
  const chatBodyRef = useRef(null);

  // Défilement automatique vers le bas
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
  
    const userMessage = { sender: "user", text: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput("");
    setError("");
  
    try {
      // Envoie la requête à ton backend Flask
      const response = await axios.post("http://localhost:5000/auth/chat", {
        message: input,
      });
  
      // Réponse du chatbot
      const botMessage = { sender: "bot", text: response.data.content };
      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch (error) {
      console.error("Erreur API:", error);
  
      // Affiche un message d'erreur spécifique
      if (error.response && error.response.status === 402) {
        setError("Solde insuffisant. Veuillez recharger votre compte.");
      } else if (error.response && error.response.data && error.response.data.error) {
        setError(error.response.data.error); // Affiche le message d'erreur du serveur
      } else {
        setError("Une erreur s'est produite. Veuillez réessayer.");
      }
  
      // Ajoute un message d'erreur du bot
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: "bot", text: "Désolé, je ne peux pas répondre pour le moment." },
      ]);
    }
  };

  // Soumission du formulaire avec la touche "Entrée"
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div className="chatbot-container">
      <button className="chat-toggle" onClick={() => setIsOpen(!isOpen)}>
        <FontAwesomeIcon icon={faComments} />
      </button>
      {isOpen && (
        <div className="chatbot">
          <div className="chat-header">Chatbot</div>
          <div className="chat-body" ref={chatBodyRef}>
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>
                {msg.text}
              </div>
            ))}
            {error && <div className="message error">{error}</div>}
          </div>
          <div className="chat-footer">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Posez votre question..."
            />
            <button onClick={sendMessage}>
              <FontAwesomeIcon icon={faPaperPlane} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;