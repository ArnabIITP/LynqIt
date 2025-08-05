import { create } from "zustand";
import axios from "axios";
import { getEnvironmentConfig } from "../config/environment";
import { persist } from "zustand/middleware";

export const useAIStore = create(
  persist(
    (set, get) => {
      const { apiBaseUrl } = getEnvironmentConfig();
      
      return {
        // Current conversation
        messages: [],
        conversationId: null,
        attachments: [],
        isLoading: false,
        isSelected: false,
        
        // Conversation history
        conversationHistory: [],
        selectedHistoryId: null,

    // Select the AI assistant
    selectAI: () => {
      set({ isSelected: true });
    },

    // Deselect the AI assistant
    deselectAI: () => {
      set({ isSelected: false });
    },

    // Set messages
    setMessages: (messages) => {
      set({ messages });
    },

    // Add message to the conversation
    addMessage: (message) => {
      set((state) => ({
        messages: [...state.messages, message]
      }));
    },

    // Set conversation ID
    setConversationId: (id) => {
      set({ conversationId: id });
    },

    // Set attachments
    setAttachments: (attachments) => {
      set({ attachments });
    },

    // Web search functionality has been removed

    // Select a conversation from history
    selectConversation: async (historyId) => {
      const history = get().conversationHistory.find(h => h.id === historyId);
      if (history) {
        // First set the local data we have to show immediate feedback
        set({
          selectedHistoryId: historyId,
          conversationId: history.conversationId,
          messages: history.messages,
          isSelected: true,
          isLoading: false // Ensure we're not in loading state
        });
        
        // If the conversation has a server ID, fetch the latest version from server
        if (history.conversationId) {
          try {
            const { apiBaseUrl } = getEnvironmentConfig();
            const response = await axios.get(`${apiBaseUrl}/ai/conversations/${history.conversationId}`, {
              withCredentials: true
            });
            
            // If we got valid data, update the messages but keep other state
            if (response.data && response.data.messages) {
              // Update local state with fresh server data but don't trigger any new API calls
              const updatedHistory = get().conversationHistory.map(conv => {
                if (conv.id === historyId) {
                  return {
                    ...conv,
                    messages: response.data.messages
                  };
                }
                return conv;
              });
              
              set({
                messages: response.data.messages,
                conversationHistory: updatedHistory
              });
            }
          } catch (error) {
            console.error('Error fetching conversation from server:', error);
            // Continue with local data if there's an error
          }
        }
      }
    },
    
    // Get conversation title from first assistant message
    getConversationTitle: (messages) => {
      const firstAssistantMessage = messages.find(m => m.role === 'assistant');
      if (!firstAssistantMessage) return 'New Conversation';
      
      // Extract a subject from the first response (first sentence or first 30 chars)
      const content = firstAssistantMessage.content;
      let title = '';
      
      // Try to get first sentence
      const firstSentence = content.split(/[.!?]/)[0];
      if (firstSentence && firstSentence.length > 5) {
        title = firstSentence.trim();
        // Limit title length
        if (title.length > 30) {
          title = title.substring(0, 30) + '...';
        }
      } else {
        // Fallback to first 30 chars
        title = content.length > 30 ? content.substring(0, 30) + '...' : content;
      }
      
      return title;
    },
    
    // Send a message to the AI
    sendMessage: async (text, attachments = []) => {
      try {
        set({ isLoading: true });
        
        const userMessage = {
          role: 'user',
          content: text,
          attachments: attachments,
          timestamp: new Date(),
        };
        
        // Add the user message to the UI
        get().addMessage(userMessage);
        
        const formData = new FormData();
        formData.append('text', text);
        // Web search functionality has been removed
        
        if (get().conversationId) {
          formData.append('conversationId', get().conversationId);
        }
        
        // Add attachments to form data
        attachments.forEach((file) => {
          formData.append('attachments', file);
        });
        
        // Show "thinking" message if the request takes more than 2 seconds
        // but only if no processing message is already visible
        let processingTimeout;
        const currentMessages = get().messages;
        const hasProcessingMessage = currentMessages.some(msg => msg.isProcessing);
        
        if (!hasProcessingMessage) {
          const processingMessage = {
            role: 'assistant',
            content: 'Processing your request...',
            isProcessing: true,
            timestamp: new Date(),
          };
          
          // Reference to setTimeout ID for later cleanup
          processingTimeout = setTimeout(() => {
            // Check again before adding to avoid race conditions
            if (!get().messages.some(msg => msg.isProcessing)) {
              get().addMessage(processingMessage);
            }
          }, 2000);
        }
        
        const response = await axios.post(`${apiBaseUrl}/ai/query`, formData, {
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        // Clear the processing timeout if it exists
        if (processingTimeout) {
          clearTimeout(processingTimeout);
        }
        
        // Remove any processing messages
        set((state) => ({
          messages: state.messages.filter(msg => !msg.isProcessing)
        }));
        
        // Set the conversation ID for future messages
        const responseConversationId = response.data.conversationId;
        if (responseConversationId) {
          get().setConversationId(responseConversationId);
        }
        
        // Check if this is a temporary error (backend is still retrying)
        if (response.data.temporaryError === true) {
          // Don't add this message to conversation history yet
          // but still show it to the user
          const tempErrorMessage = {
            role: 'assistant',
            content: response.data.message,
            isTemporary: true,
            timestamp: new Date(),
          };
          
          get().addMessage(tempErrorMessage);
          
          // Wait a bit and try again
          setTimeout(() => {
            // First remove any processing messages to prevent duplicates
            set((state) => ({
              messages: state.messages.filter(msg => !msg.isProcessing)
            }));
            
            // Retry the same message after a delay
            get().sendMessage(text, attachments);
          }, 5000);
          
          return false;
        }
        
        // Create assistant message for normal response
        const assistantMessage = {
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date(),
        };
        
        // Add the assistant's response to the UI
        get().addMessage(assistantMessage);
        
        // Update or create conversation in history
        const updatedMessages = [...get().messages, assistantMessage];
        const existingHistory = get().conversationHistory;
        let updatedHistory = [];
        
        // If this is a new conversation, create a history entry
        if (!get().selectedHistoryId) {
          // Create a new conversation with a title from the first response
          const newConversation = {
            id: Date.now().toString(),
            conversationId: responseConversationId,
            title: get().getConversationTitle([...get().messages, assistantMessage]),
            lastMessage: assistantMessage.content,
            timestamp: new Date(),
            messages: updatedMessages,
          };
          
          updatedHistory = [newConversation, ...existingHistory];
          set({ 
            conversationHistory: updatedHistory,
            selectedHistoryId: newConversation.id
          });
        } else {
          // Update existing conversation
          updatedHistory = existingHistory.map(conv => {
            if (conv.id === get().selectedHistoryId) {
              return {
                ...conv,
                lastMessage: assistantMessage.content,
                timestamp: new Date(),
                messages: updatedMessages,
                title: conv.title || get().getConversationTitle(updatedMessages),
              };
            }
            return conv;
          });
          
          set({ conversationHistory: updatedHistory });
        }
        
        // Clear attachments after sending
        set({ attachments: [] });
        
        return true;
      } catch (error) {
        console.error('Error sending message to AI:', error);
        
        // Clear any processing timeout if it exists
        if (processingTimeout) {
          clearTimeout(processingTimeout);
        }
        
        // Remove any processing messages first
        set((state) => ({
          messages: state.messages.filter(msg => !msg.isProcessing)
        }));
        
        // Add error message to chat
        const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          "Sorry, I encountered an error processing your request. Please try again later.";
        
        get().addMessage({
          role: 'assistant',
          content: errorMessage,
          timestamp: new Date(),
          isError: true,
        });
        
        // If we got a conversation ID from the error response, save it
        if (error.response?.data?.conversationId) {
          get().setConversationId(error.response.data.conversationId);
        }
        
        return false;
      } finally {
        set({ isLoading: false });
      }
    },
    
    // Start a new conversation
    startNewConversation: () => {
      set({
        messages: [],
        conversationId: null,
        attachments: [],
        selectedHistoryId: null,
        isLoading: false
      });
    },
    
    // Delete a conversation from history and database
    deleteConversation: async (historyId) => {
      const conversation = get().conversationHistory.find(conv => conv.id === historyId);
      
      if (conversation && conversation.id) {
        try {
          // Delete from the database if it has a valid ID (MongoDB ObjectId)
          if (conversation.conversationId) {
            const { apiBaseUrl } = getEnvironmentConfig();
            await axios.delete(`${apiBaseUrl}/ai/conversations/${conversation.conversationId}`, {
              withCredentials: true
            });
            console.log(`Successfully deleted conversation from database: ${conversation.conversationId}`);
          }
        } catch (error) {
          console.error('Error deleting conversation from database:', error);
          // Continue with local deletion even if server deletion fails
        }
      }
      
      // Update local state
      const updatedHistory = get().conversationHistory.filter(conv => conv.id !== historyId);
      
      // If we're deleting the currently selected conversation, clear the current state
      if (historyId === get().selectedHistoryId) {
        set({
          conversationHistory: updatedHistory,
          selectedHistoryId: null,
          messages: [],
          conversationId: null,
        });
      } else {
        set({ conversationHistory: updatedHistory });
      }
    },
    
    // Search conversations
    searchConversations: (query) => {
      if (!query || query.trim() === '') return get().conversationHistory;
      
      const lowercaseQuery = query.toLowerCase().trim();
      return get().conversationHistory.filter(conv => {
        // Search in title
        if (conv.title?.toLowerCase().includes(lowercaseQuery)) return true;
        
        // Search in lastMessage if available
        if (conv.lastMessage?.toLowerCase().includes(lowercaseQuery)) return true;
        
        // Search in messages content
        return conv.messages.some(msg => 
          msg.content?.toLowerCase().includes(lowercaseQuery)
        );
      });
    }
  };
}), {
  name: 'ai-conversation-store',
  // Only persist these keys
  partialize: (state) => ({
    conversationHistory: state.conversationHistory
  }),
});
