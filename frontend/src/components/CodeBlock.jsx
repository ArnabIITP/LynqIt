import React, { useState, useRef } from 'react';
import './code-block.css';

const CodeBlock = ({ language, code }) => {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef(null);
  
  const copyToClipboard = () => {
    if (!code) return;
    
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  // Clean up language identifier
  const displayLanguage = language ? language.replace(/^language-/, '') : 'text';
  
  return (
    <div className="code-block-wrapper">
      <div className="code-block">
        <div className="code-header">
          <span className="code-language">{displayLanguage}</span>
          <button 
            onClick={copyToClipboard}
            className="copy-button"
            aria-label="Copy code to clipboard"
          >
            {copied ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span className="copied-text">Copied!</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                </svg>
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <pre ref={codeRef}>
          <code className={language}>{code}</code>
        </pre>
      </div>
    </div>
  );
};

export default CodeBlock;
