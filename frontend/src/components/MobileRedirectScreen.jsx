import React, { useEffect, useState } from "react";
import "./MobileRedirectScreen.css";

const MobileRedirectScreen = () => {
  const [animate, setAnimate] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  
  const messages = [
    "Use LYNQIT from a browser in your computer or laptop",
    "Experience the full LYNQIT interface on desktop",
    "For the best experience, switch to a larger device",
    "Mobile version coming soon! For now, use desktop"
  ];

  // Initialize animation after component mounts
  useEffect(() => {
    setTimeout(() => setAnimate(true), 300);
    
    // Cycle through messages
    const intervalId = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 4000);
    
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className={`mobile-redirect ${animate ? 'animated' : ''}`}>
      <div className="mobile-redirect-container">
        <div className="logo-container">
          <img src="/logo.svg" alt="LYNQIT Logo" className="mobile-logo" />
        </div>
        
        <h1 className="app-title">LYNQIT</h1>
        
        <div className="message-container">
          {messages.map((message, index) => (
            <p 
              key={index} 
              className={`redirect-message ${messageIndex === index ? 'active' : ''}`}
            >
              {message}
            </p>
          ))}
        </div>
        
        <div className="device-illustration">
          <div className="screen-content">
            <div className="chat-bubble left"></div>
            <div className="chat-bubble right"></div>
            <div className="chat-bubble left short"></div>
          </div>
          <div className="laptop">
            <div className="laptop-screen">
              <div className="laptop-screen-content"></div>
            </div>
            <div className="laptop-keyboard"></div>
          </div>
        </div>

        <div className="dots-container">
          {messages.map((_, index) => (
            <span 
              key={index} 
              className={`dot ${messageIndex === index ? 'active' : ''}`}
              onClick={() => setMessageIndex(index)}
            ></span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MobileRedirectScreen;
