import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useAIStore } from '../store/useAIStore';
import { formatTimeAgo } from '../utils/timeUtils';
import { FiPaperclip, FiSend, FiX } from 'react-icons/fi';

import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import CodeBlock from './CodeBlock';
import './markdown-styles.css';

// Process markdown content and replace code block placeholders with CodeBlock components
const processMarkdownWithCodeBlocks = (htmlContent) => {
  if (!htmlContent) return null;
  
  // Split the HTML content by the react-code-block placeholders
  const parts = htmlContent.split('<div class="react-code-block"');
  if (parts.length === 1) return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
  
  // Process each part
  const result = [];
  result.push(<span key="start" dangerouslySetInnerHTML={{ __html: parts[0] }} />);
  
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const closeDivIndex = part.indexOf('</div>');
    
    if (closeDivIndex !== -1) {
      // Extract attributes
      const dataLanguageMatch = part.match(/data-language="([^"]*?)"/);
      const dataCodeMatch = part.match(/data-code="([^"]*?)"/);
      
      const language = dataLanguageMatch ? dataLanguageMatch[1] : '';
      const code = dataCodeMatch ? decodeURIComponent(dataCodeMatch[1]) : '';
      
      // Add code block component
      result.push(
        <CodeBlock 
          key={`code-${i}`} 
          language={language} 
          code={code} 
        />
      );
      
      // Add remaining HTML
      const remainingHtml = part.substring(closeDivIndex + 6);
      if (remainingHtml) {
        result.push(
          <span key={`end-${i}`} dangerouslySetInnerHTML={{ __html: remainingHtml }} />
        );
      }
    }
  }
  
  return <>{result}</>;
};

const AIChatContainer = () => {
  const [input, setInput] = useState('');
  const [showAttachments, setShowAttachments] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const maxAttachments = 8;
  
  // Enhanced markdown parser with code highlighting
  const md = useMemo(() => {
    const parser = new MarkdownIt({
      breaks: true,
      linkify: true,
      typographer: true,
      highlight: (str, lang) => {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return hljs.highlight(str, { language: lang }).value;
          } catch (__) {}
        }
        return ''; // Use external default escaping
      }
    });
    
    // Override the renderer for code blocks to use our custom component
    parser.renderer.rules.fence = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const code = token.content.trim();
      const language = token.info ? `language-${token.info}` : '';
      
      // Return HTML that will be replaced with our CodeBlock component using React's dangerouslySetInnerHTML
      return `<div class="react-code-block" data-language="${language}" data-code="${encodeURIComponent(code)}"></div>`;
    };
    
    return parser;
  }, []);
  
  const { 
    messages, 
    isLoading,
    attachments, 
    setAttachments, 
    sendMessage,
    conversationHistory,
    selectedHistoryId,
    getConversationTitle
  } = useAIStore();
  const { authUser } = useAuthStore();

  // Filter out any legacy processing placeholders just in case
  const cleanedMessages = useMemo(
    () => (messages || []).filter(m => {
      const c = typeof m?.content === 'string' ? m.content.toLowerCase() : '';
      return !m?.isProcessing && !c.includes('processing your request');
    }),
    [messages]
  );

  useEffect(() => {
    scrollToBottom();
  }, [cleanedMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() && attachments.length === 0) return;

    setInput('');
    setShowAttachments(false);
    
    // Send message using the store
    await sendMessage(input, attachments);
  };

  const handleAttachmentClick = (e) => {
    // Prevent form submission if this is triggered by a button click within a form
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setShowAttachments(!showAttachments);
    if (!showAttachments) {
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 100);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const remainingSlots = maxAttachments - attachments.length;
    
    // Filter only image files
    const imageFiles = selectedFiles.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length !== selectedFiles.length) {
      alert('Only image files are allowed as attachments');
    }
    
    if (imageFiles.length > remainingSlots) {
      alert(`You can only attach up to ${maxAttachments} images. ${remainingSlots} slots remaining.`);
      const trimmedFiles = imageFiles.slice(0, remainingSlots);
      setAttachments([...attachments, ...trimmedFiles]);
    } else {
      setAttachments([...attachments, ...imageFiles]);
    }
    
    // Reset the file input
    e.target.value = '';
  };

  const removeAttachment = (index) => {
    const newAttachments = [...attachments];
    newAttachments.splice(index, 1);
    setAttachments(newAttachments);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-base-100 p-2 border-b border-base-200 flex justify-between items-center shadow-sidebar">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <img src="/images/ai-logo.svg" alt="LynqIt AI" className="w-6 h-6" />
          </div>
          <div>
            {selectedHistoryId ? (
              <>
                <h2 className="font-medium text-text">
                  {conversationHistory.find(c => c.id === selectedHistoryId)?.title || 'LynqIt AI'}
                </h2>
                <p className="text-xs text-medium-gray">
                  {new Date(conversationHistory.find(c => c.id === selectedHistoryId)?.timestamp).toLocaleString()}
                </p>
              </>
            ) : (
              <>
                <h2 className="font-medium text-dark-gray">
                  {messages.length > 0 ? getConversationTitle(messages) : 'LynqIt AI'}
                </h2>
                <p className="text-sm text-medium-gray">
                  Ask anything or upload files
                </p>
              </>
            )}
          </div>
        </div>
        {/* Close (cross) button */}
        <button
          className="ml-2 p-2 rounded-full hover:bg-base-200 text-base-content/70 hover:text-error transition-colors"
          title="Close AI Assistant"
          aria-label="Close AI Assistant"
          onClick={() => {
            // Deselect AI assistant using the store
            if (typeof window !== 'undefined') {
              // Dynamically import to avoid circular dependency
              import('../store/useAIStore').then(mod => {
                mod.useAIStore.getState().deselectAI();
              });
            }
          }}
        >
          <FiX size={22} />
        </button>
      </div>
      
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
  {cleanedMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-24 h-24 mb-6 rounded-full bg-base-200 flex items-center justify-center">
              <img src="/images/ai-logo.svg" alt="LynqIt AI" className="w-14 h-14" />
            </div>
            <h3 className="text-2xl font-medium mb-3 text-base-content">Welcome to LynqIt AI</h3>
            <p className="max-w-md px-4 mb-2 text-neutral">
              Ask me anything! I can help with questions, provide information, or analyze images.
            </p>
          </div>
        )}
        
  {cleanedMessages.map((message, index) => (
          <div
            key={index}
            className={`mb-6 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
          >
            <div className="flex items-start gap-3 mb-2">
              {message.role !== 'user' && (
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                    <img src="/images/ai-logo.svg" alt="LynqIt AI" className="w-6 h-6" />
                  </div>
                </div>
              )}
              
              <div className={message.role === 'user' ? 'ml-auto flex flex-col items-end' : 'flex flex-col'}>
                <div className="text-xs text-medium-gray mb-1">
                  {message.role === 'user' ? 'You' : 'LynqIt AI'} • {formatTimeAgo(message.timestamp)}
                </div>
                
                <div className={`max-w-3xl ${
                  message.role === 'user'
                    ? 'bg-chat-bubble-primary text-white'
                    : message.isProcessing
                    ? 'bg-light-gray text-medium-gray'
                    : message.isTemporary
                    ? 'bg-light-gray text-text'
                    : message.isError
                    ? 'bg-error/10 text-text'
                    : 'bg-chat-bubble-secondary dark:bg-chat-bubble-secondary-dark text-base-content'
                } p-4 rounded-lg shadow-message ${
                  message.isProcessing ? 'animate-pulse' : ''
                }`}>
                  {message.isProcessing ? (
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 rounded-full bg-tangerine animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-tangerine animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-tangerine animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span>{message.content}</span>
                    </div>
                  ) : message.isTemporary ? (
                    <div className="flex flex-col space-y-2">
                      <div className="whitespace-pre-line break-words text-yellow-800 dark:text-yellow-200">
                        {processMarkdownWithCodeBlocks(md.render(message.content))}
                      </div>
                      <div className="text-xs text-yellow-600 dark:text-yellow-400 italic mt-2">
                        Retrying request automatically...
                      </div>
                    </div>
                  ) : (
                    <div 
                      className={`whitespace-pre-line break-words ${message.isError ? 'text-error' : 'text-base-content'}`}
                    >
                      {processMarkdownWithCodeBlocks(md.render(message.content))}
                    </div>
                  )}
                  
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.attachments.map((file, fileIndex) => (
                        <div
                          key={fileIndex}
                          className="flex items-center bg-base-200/50 rounded p-1"
                        >
                          {file.fileType === 'image' ? (
                            <img
                              src={file.url || URL.createObjectURL(file)}
                              alt="Attachment"
                              className="h-10 w-10 object-cover rounded"
                            />
                          ) : (
                            <span className="text-xs">
                              {file.fileName || file.name}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {message.role === 'user' && (
                <div className="flex-shrink-0">
                  {authUser?.profilePic ? (
                    <div className="w-10 h-10 rounded-full overflow-hidden">
                      <img src={authUser.profilePic} alt={authUser.fullName || 'You'} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-primary-content font-bold">
                        {(authUser?.fullName?.[0] || authUser?.username?.[0] || 'U').toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Only show loading indicator if there's no processing message already visible */}
        {isLoading && (
          <div className="mb-6 text-left">
            <div className="flex items-start gap-3 mb-2">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-secondary font-bold">A</span>
                </div>
              </div>
              <div className="flex flex-col">
                <div className="text-xs text-neutral mb-1">
                  LynqIt AI • now
                </div>
                <div className="bg-base-200 p-4 rounded-md shadow-sm">
                  <div className="flex space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 rounded-full bg-tangerine animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-tangerine animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-tangerine animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-sm text-neutral">Lynqing...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      

      
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="mx-4 mb-2 p-2 bg-base-200/60 rounded-lg">
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="relative bg-base-100 rounded p-1 shadow-sm"
              >
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="h-14 w-14 object-cover rounded"
                />
                <button
                  onClick={() => removeAttachment(index)}
                  className="absolute -top-2 -right-2 bg-error text-white rounded-full p-1 w-5 h-5 flex items-center justify-center"
                >
                  <FiX size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Input Area */}
      <div className="p-1.5 bg-base-100">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 rounded-full bg-base-200 px-3 py-1.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            multiple
            accept="image/*"
          />
          <button
            type="button" 
            onClick={(e) => handleAttachmentClick(e)}
            className="text-medium-gray hover:text-text-secondary transition-colors"
            title="Attach files"
          >
            <FiPaperclip size={18} />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="bg-transparent border-none focus:outline-none text-base-content w-full py-1 placeholder-neutral resize-none min-h-[40px] max-h-40"
            disabled={isLoading}
            rows={1}
            onPaste={async (e) => {
              if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
                const file = e.clipboardData.files[0];
                if (file.type.startsWith('image/')) {
                  e.preventDefault();
                  // Use existing file input logic for images
                  const dataTransfer = { target: { files: [file] } };
                  handleFileChange(dataTransfer);
                }
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                if (input.trim() || attachments.length > 0) {
                  e.preventDefault();
                  handleSubmit(e);
                } else {
                  e.preventDefault();
                }
              }
              // Shift+Enter inserts newline (default behavior)
            }}
            style={{overflow: 'hidden'}}
          />
          <button
            type="submit"
            className={`p-1 rounded-full ${(!input.trim() && attachments.length === 0) || isLoading 
              ? 'text-medium-gray' 
              : 'text-white bg-tangerine hover:bg-tangerine/90'}`}
            disabled={(!input.trim() && attachments.length === 0) || isLoading}
          >
            <FiSend size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIChatContainer;
