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
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-800 overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="text-white text-lg font-bold">A</span>
          </div>
          <div>
            <h2 className="font-medium text-gray-900 dark:text-white">Assistant</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ask anything or upload files
            </p>
          </div>
        </div>
        {conversationId && (
          <button 
            onClick={startNewConversation}
            className="text-sm px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            New Conversation
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <span className="text-blue-500 dark:text-blue-300 text-2xl font-bold">A</span>
            </div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
              How can I assist you today?
            </h3>
            <p className="max-w-md">
              Ask me questions, seek information, or upload documents for me to analyze.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`mb-4 ${
                  message.role === 'user'
                    ? 'ml-auto max-w-[80%] flex flex-col items-end'
                    : 'mr-auto max-w-[80%]'
                }`}
              >
                <div
                  className={`p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : message.isError
                      ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
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
                <div
                  className={`text-xs mt-1 text-gray-500 ${
                    message.role === 'user' ? 'text-right' : ''
                  }`}
                >
                  {formatTimeAgo(message.timestamp)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="mr-auto max-w-[80%] mb-4">
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg flex items-center space-x-2">
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
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div 
                key={index} 
                className="bg-white dark:bg-gray-800 rounded-md px-2 py-1 text-xs flex items-center gap-2 border border-gray-200 dark:border-gray-700"
              >
                <span className="truncate max-w-[100px]">{file.name}</span>
                <button 
                  onClick={() => removeAttachment(index)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <FiX size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={toggleWebSearch}
              className={`p-2 rounded-full ${
                webSearch
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
              title={webSearch ? "Web search enabled" : "Enable web search"}
            >
              <FiSearch size={20} />
            </button>
            <button
              type="button"
              onClick={handleAttachmentClick}
              className={`p-2 rounded-full ${
                showAttachments
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
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
              <FiPaperclip size={20} />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || (!input.trim() && attachments.length === 0)}
              className={`p-2 rounded-full ${
                !input.trim() && attachments.length === 0
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              <FiSend size={20} />
            </button>
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
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 px-2">
            <span>
              {webSearch && <span className="text-blue-500 dark:text-blue-400 mr-2">Web search enabled</span>}
              {attachments.length > 0 && (
                <span>{attachments.length} of {maxAttachments} files attached</span>
              )}
            </span>
            <span>Enter to send, Shift+Enter for new line</span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AIAssistant;
