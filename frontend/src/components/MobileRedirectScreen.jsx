import React, { useEffect, useState } from "react";
import "./MobileRedirectScreen.css";
import logo from "../../public/logo.svg";

const MobileRedirectScreen = () => {
  const [animate, setAnimate] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [particles, setParticles] = useState([]);
  
  const messages = [
    "Use LYNQIT from a computer browser",
    "Experience the full interface on desktop",
    "For the best experience, switch to a larger device",
    "Mobile version coming soon! Use desktop for now"
  ];

  // Generate random particles for background effect
  useEffect(() => {
    const generateParticles = () => {
      const newParticles = [];
      for (let i = 0; i < 20; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 10 + 5,
          duration: Math.random() * 20 + 10
        });
      }
      setParticles(newParticles);
    };
    
    generateParticles();
  }, []);

  // Initialize animation after component mounts
  useEffect(() => {
    setTimeout(() => setAnimate(true), 300);
    
    // Cycle through messages
    const intervalId = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 4000);
    
    return () => clearInterval(intervalId);
  }, [messages.length]);

  return (
    <div className={`mobile-redirect ${animate ? 'animated' : ''}`}>
      {/* Animated background particles */}
      <div className="particles-container">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="particle"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDuration: `${particle.duration}s`
            }}
          ></div>
        ))}
      </div>
      
      <div className="mobile-redirect-container">
        {/* App Logo Section */}
        <div className="logo-wrapper">
          <div className="logo-container">
            <img src={logo} alt="LYNQIT Logo" className="mobile-logo" />
            <div className="logo-glow"></div>
          </div>
        </div>
        
        {/* App Title */}
        <h1 className="app-title">LYNQIT</h1>
        <div className="app-title-underline"></div>
        
        <div className="device-illustration">
          <div className="laptop">
            <div className="laptop-screen">
              <div className="laptop-screen-navbar"></div>
              <div className="laptop-screen-content">
                <div className="chat-bubble right">
                  <span className="message-text">Hello!</span>
                </div>
                <div className="chat-bubble left">
                  <span className="message-text">How are you?</span>
                </div>
                <div className="chat-bubble right short">
                  <span className="message-text">Great, thanks!</span>
                </div>
              </div>
            </div>
            <div className="laptop-base"></div>
          </div>
        </div>
        
        <div className="content-wrapper">
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
        </div>
      </div>
      
      <div className="bottom-section">
        <div className="dots-indicator">
          {messages.map((_, index) => (
            <span 
              key={index} 
              className={`dot ${messageIndex === index ? 'active' : ''}`}
            ></span>
          ))}
        </div>
        
        <div className="desktop-icon-container">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="desktop-icon">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
        </div>
        
        <div className="desktop-message">
          Switch to desktop for the full experience
        </div>
      </div>
    </div>
  );
};

export default MobileRedirectScreen;
