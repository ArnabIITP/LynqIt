import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import axios from 'axios';
import { getEnvironmentConfig } from '../config/environment';
import { formatTimeAgo } from '../utils/timeUtils';
import { FiPaperclip, FiSend, FiSearch, FiTrash2, FiX } from 'react-icons/fi';

const AIAssistant = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [webSearch, setWebSearch] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const { apiBaseUrl } = getEnvironmentConfig();
  const { authUser } = useAuthStore();
  const maxAttachments = 8;

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() && attachments.length === 0) return;

    const userMessage = {
      role: 'user',
      content: input,
      attachments: attachments,
      timestamp: new Date(),
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput('');
    setIsLoading(true);
    setShowAttachments(false);

    try {
      const formData = new FormData();
      formData.append('text', input);
      formData.append('webSearch', webSearch);
      
      if (conversationId) {
        formData.append('conversationId', conversationId);
      }
      
      // Add attachments to form data
      attachments.forEach((file, index) => {
        formData.append('attachments', file);
      });
      
      const response = await axios.post(`${apiBaseUrl}/ai/query`, formData, {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setConversationId(response.data.conversationId);
      
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date(),
        },
      ]);
      
      setAttachments([]);
    } catch (error) {
      console.error('Error processing AI query:', error);
      
      // Get the error message from the response if available
      const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error || 
                           "Sorry, I encountered an error processing your request. Please try again later.";
                           
      // If we got a conversation ID from the error response, save it
      if (error.response?.data?.conversationId) {
        setConversationId(error.response.data.conversationId);
      }
      
      // Add the error message to the chat
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: 'assistant',
          content: errorMessage,
          timestamp: new Date(),
          isError: true,
        },
      ]);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again later.',
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAttachmentClick = () => {
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
    
    if (selectedFiles.length > remainingSlots) {
      alert(`You can only attach up to ${maxAttachments} files. ${remainingSlots} slots remaining.`);
      const trimmedFiles = selectedFiles.slice(0, remainingSlots);
      setAttachments((prev) => [...prev, ...trimmedFiles]);
    } else {
      setAttachments((prev) => [...prev, ...selectedFiles]);
    }
    
    // Reset the file input
    e.target.value = '';
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleWebSearch = () => {
    setWebSearch(!webSearch);
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setAttachments([]);
    setWebSearch(false);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-white via-white to-orange-50 dark:from-[#181D23] dark:via-[#1E2329] dark:to-[#181D23] overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 flex justify-between items-center border-b border-black/5 dark:border-white/10 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-white/5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-400 via-orange-500 to-rose-500 shadow-sm ring-1 ring-black/10 flex items-center justify-center">
            <span className="text-white text-lg font-semibold tracking-tight">AI</span>
          </div>
          <div className="space-y-0.5">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">Assistant <span className="pill">Beta</span></h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Ask anything or upload files for context</p>
          </div>
        </div>
        {conversationId && (
          <button 
            onClick={startNewConversation}
            className="btn-modern-ghost text-sm px-4 py-2 h-9"
          >
            New Chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 thin-scrollbar space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 space-y-6 max-w-xl mx-auto">
            <div className="relative group">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-400 via-orange-500 to-rose-500 flex items-center justify-center shadow-lg ring-1 ring-black/10 group-hover:scale-105 transition-base">
                <span className="text-white text-3xl font-semibold tracking-tight">AI</span>
              </div>
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-orange-400/40 to-rose-500/40 blur opacity-40 group-hover:opacity-60 transition" />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 tracking-tight">How can I help you today?</h3>
              <p className="max-w-md mx-auto text-sm leading-relaxed">
                Ask about anything, request summaries, brainstorm ideas, or upload supporting files for deeper context.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full">
              <button onClick={() => setInput('Summarize the following text: ')} className="card-modern text-left text-sm font-medium h-full">
                Quick summary
              </button>
              <button onClick={() => setInput('Generate brainstorming ideas about ')} className="card-modern text-left text-sm font-medium">
                Brainstorm ideas
              </button>
              <button onClick={() => setInput('Explain this concept in simple terms: ')} className="card-modern text-left text-sm font-medium">
                Simplify concept
              </button>
              <button onClick={() => setInput('Draft an email about ')} className="card-modern text-left text-sm font-medium">
                Draft an email
              </button>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`mb-4 ${
                  message.role === 'user'
                    ? 'ml-auto max-w-[82%] flex flex-col items-end fade-in'
                    : 'mr-auto max-w-[82%] fade-in'
                }`}
              >
                <div
                  className={`text-sm leading-relaxed tracking-[0.15px] shadow-sm ${
                    message.role === 'user'
                      ? 'bubble bubble-user'
                      : message.isError
                      ? 'bubble bubble-error'
                      : 'bubble bubble-assistant'
                  }`}
                >
                  {message.content}
                  
                  {/* Render attachment previews for user messages */}
                  {message.role === 'user' && message.attachments && message.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {message.attachments.map((file, fileIndex) => (
                        <div 
                          key={fileIndex} 
                          className="text-xs bg-blue-600 text-white rounded px-2 py-1 flex items-center"
                        >
                          {file.name || 'File'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className={`text-[11px] mt-1 font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 ${message.role === 'user' ? 'text-right' : ''}`}>
                  {formatTimeAgo(message.timestamp)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="mr-auto max-w-[82%] mb-4">
                <div className="bubble bubble-assistant flex items-center gap-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Attachment Preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-3 bg-white/70 dark:bg-white/5 backdrop-blur border-t border-black/5 dark:border-white/10">
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div 
                key={index} 
                className="px-2 py-1 text-xs flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500/10 to-rose-500/10 text-gray-700 dark:text-gray-200 ring-1 ring-black/10 dark:ring-white/10"
              >
                <span className="truncate max-w-[140px] font-medium">{file.name}</span>
                <button 
                  onClick={() => removeAttachment(index)}
                  className="hover:text-orange-600 dark:hover:text-orange-400 transition"
                >
                  <FiX size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 sm:p-5 border-t border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur">
        <form onSubmit={handleSubmit} className="flex flex-col space-y-3">
          <div className="flex items-end gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleWebSearch}
                className={`icon-btn h-11 w-11 ${
                  webSearch
                    ? 'ring-2 ring-orange-500/50 shadow-md'
                    : ''
                }`}
                title={webSearch ? "Web search enabled" : "Enable web search"}
              >
                <FiSearch size={18} className={webSearch ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-300'} />
              </button>
              <button
                type="button"
                onClick={handleAttachmentClick}
                className={`icon-btn h-11 w-11 ${
                  showAttachments ? 'ring-2 ring-orange-500/50 shadow-md' : ''
                } ${
                  attachments.length >= maxAttachments ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={attachments.length >= maxAttachments}
                title={
                  attachments.length >= maxAttachments
                    ? `Maximum ${maxAttachments} attachments reached`
                    : 'Add attachments'
                }
              >
                <FiPaperclip size={18} className={showAttachments ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-300'} />
              </button>
            </div>
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything..."
                className="field-modern pr-14 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none min-h-[40px] max-h-40"
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
              <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                <button
                  type="submit"
                  disabled={isLoading || (!input.trim() && attachments.length === 0)}
                  className={`btn-modern-primary h-9 px-4 text-sm font-medium tracking-wide flex items-center gap-1.5 rounded-md shadow-sm disabled:opacity-60 disabled:cursor-not-allowed ${(!input.trim() && attachments.length === 0) ? '!bg-gray-300 !text-gray-600 dark:!bg-gray-700 dark:!text-gray-400' : ''}`}
                >
                  <FiSend size={16} />
                  <span className="hidden md:inline">Send</span>
                </button>
              </div>
            </div>
          </div>
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            className="hidden"
            accept="image/*, application/pdf, text/plain, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          />
          {/* Helper text */}
          <div className="flex justify-between text-[11px] font-medium tracking-wide text-gray-500 dark:text-gray-400 px-1">
            <span className="flex gap-3">
              {webSearch && <span className="text-orange-600 dark:text-orange-400">Web</span>}
              {attachments.length > 0 && (
                <span>{attachments.length}/{maxAttachments} files</span>
              )}
            </span>
            <span>Enter ↵ · Shift+Enter = newline</span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AIAssistant;
