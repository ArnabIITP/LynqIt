import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { useStatusStore } from "./useStatusStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [], // Users with existing conversations
  allUsers: [], // All users for search
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  userStatuses: {}, // Holds online status and last seen times
  unreadCounts: {
    personal: {},
    groups: {},
    mentions: {},
    totalPersonal: 0,
    totalGroups: 0,
    totalMentions: 0
  },
  pendingDeliveredMessages: [], // Messages waiting to be marked as delivered
  pendingSeenMessages: [], // Messages waiting to be marked as seen
  pendingEdits: {}, // Message edits waiting to be sent
  pendingDeletes: {}, // Message deletions waiting to be sent
  replyingTo: null, // Tracks number of unread messages per user
  isDeletingMessage: false,
  connectionStatus: 'connected', // 'connected', 'connecting', 'disconnected'
  lastMessageTimestamp: null, // Track last message received time for auto-refresh

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");

      // Sort users to show pinned ones first
      const sortedUsers = [...res.data].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });

      set({ users: sortedUsers });

      // Get unread count for each user
      await get().getUnreadCounts();
    } catch (error) {
      console.error("Error in getUsers:", error);
      toast.error(error.response?.data?.message || "Failed to load contacts");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getUnreadCounts: async () => {
    try {
      const res = await axiosInstance.get("/messages/unread-counts");
      set({ unreadCounts: res.data });
      return res.data;
    } catch (error) {
      console.error("Error fetching unread counts:", error);
      return {
        personal: {},
        groups: {},
        mentions: {},
        totalPersonal: 0,
        totalGroups: 0,
        totalMentions: 0
      };
    }
  },

  getAllUsers: async () => {
    try {
      const res = await axiosInstance.get("/auth/users");
      set({ allUsers: res.data });
    } catch (error) {
      console.error("Error fetching all users:", error);
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      
      // Ensure messages are sorted chronologically by createdAt
      const sortedMessages = [...res.data].sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      );
      
      set({ messages: sortedMessages });

      // Set the timestamp of the latest message for auto-refresh comparison
      if (sortedMessages && sortedMessages.length > 0) {
        const latestMessage = sortedMessages[sortedMessages.length - 1];
        set({ lastMessageTimestamp: new Date(latestMessage.createdAt).getTime() });
      }

      // Mark received messages as delivered
      const messagesToMark = res.data
        .filter(msg =>
          msg.receiverId === useAuthStore.getState().authUser._id &&
          msg.status === 'sent'
        )
        .map(msg => msg._id);

      if (messagesToMark.length > 0) {
        get().markMessagesAsDelivered(messagesToMark);
      }

      // Mark all as seen if chat is currently open and mark chat as read
      setTimeout(() => {
        if (get().selectedUser?._id === userId) {
          get().markMessagesAsSeen(messagesToMark);

          // Mark chat as read using the proper API
          get().markChatAsRead('direct', userId);
        }
      }, 1000);
    } catch (error) {
      console.error("Error in getMessages:", error);
      toast.error(error.response?.data?.message || "Failed to load messages");

      // If there was an error loading messages, try to reconnect socket
      get().handleSocketReconnect();
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  // Handle socket disconnection and reconnection
  handleSocketReconnect: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      // Check socket status
      if (!socket.connected) {
        set({ connectionStatus: 'connecting' });

        // Try to reconnect
        socket.connect();

        // Re-subscribe to messages
        get().resubscribeToMessages();

        toast.success("Reconnecting to chat server...");
      }
    } else {
      // No socket, try to create a new one
      useAuthStore.getState().connectSocket();
      set({ connectionStatus: 'connecting' });

      setTimeout(() => {
        const newSocket = useAuthStore.getState().socket;
        if (newSocket && newSocket.connected) {
          set({ connectionStatus: 'connected' });
          get().resubscribeToMessages();
          toast.success("Chat connection restored");
        } else {
          set({ connectionStatus: 'disconnected' });
          toast.error("Could not connect to chat server. Please refresh the page.");
        }
      }, 2000);
    }
  },

  // Re-subscribe to message events
  resubscribeToMessages: () => {
    get().unsubscribeFromMessages();
    get().subscribeToMessages();

    // Refresh current conversation if any
    if (get().selectedUser) {
      get().getMessages(get().selectedUser._id);
    }
  },

  // Mark chat as read (WhatsApp-style)
  markChatAsRead: async (chatType, targetId, messageId = null) => {
    try {
      const res = await axiosInstance.post("/messages/read", {
        chatType,
        targetId,
        messageId
      });

      // Update local unread counts
      set({ unreadCounts: res.data.unreadCounts });
      return res.data;
    } catch (error) {
      console.error("Error marking chat as read:", error);
    }
  },

  resetUnreadCount: (userId) => {
    set(state => ({
      unreadCounts: {
        ...state.unreadCounts,
        personal: {
          ...state.unreadCounts.personal,
          [userId]: 0
        },
        totalPersonal: Math.max(0, (state.unreadCounts.totalPersonal || 0) - (state.unreadCounts.personal?.[userId] || 0))
      }
    }));
  },

  incrementUnreadCount: (userId) => {
    set(state => ({
      unreadCounts: {
        ...state.unreadCounts,
        personal: {
          ...state.unreadCounts.personal,
          [userId]: (state.unreadCounts.personal?.[userId] || 0) + 1
        },
        totalPersonal: (state.unreadCounts.totalPersonal || 0) + 1
      }
    }));
  },

  // Group unread count functions
  resetGroupUnreadCount: (groupId) => {
    set(state => ({
      unreadCounts: {
        ...state.unreadCounts,
        groups: {
          ...state.unreadCounts.groups,
          [groupId]: 0
        },
        mentions: {
          ...state.unreadCounts.mentions,
          [groupId]: 0
        },
        totalGroups: Math.max(0, (state.unreadCounts.totalGroups || 0) - (state.unreadCounts.groups?.[groupId] || 0)),
        totalMentions: Math.max(0, (state.unreadCounts.totalMentions || 0) - (state.unreadCounts.mentions?.[groupId] || 0))
      }
    }));
  },

  incrementGroupUnreadCount: (groupId) => {
    set(state => ({
      unreadCounts: {
        ...state.unreadCounts,
        groups: {
          ...state.unreadCounts.groups,
          [groupId]: (state.unreadCounts.groups?.[groupId] || 0) + 1
        },
        totalGroups: (state.unreadCounts.totalGroups || 0) + 1
      }
    }));
  },

  incrementMentionCount: (groupId) => {
    set(state => ({
      unreadCounts: {
        ...state.unreadCounts,
        mentions: {
          ...state.unreadCounts.mentions,
          [groupId]: (state.unreadCounts.mentions?.[groupId] || 0) + 1
        },
        totalMentions: (state.unreadCounts.totalMentions || 0) + 1
      }
    }));
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    const socket = useAuthStore.getState().socket;

    try {
      // Optimistically update UI with instant feedback
      const tempId = `temp-${Date.now()}`;
      const pendingMessage = {
        _id: tempId,
        senderId: useAuthStore.getState().authUser._id,
        receiverId: selectedUser._id,
        text: messageData.text || "",
        image: messageData.image,
        mediaType: messageData.mediaType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'sending',
        reactions: [],
        isPending: true
      };

      // Instantly add message to UI for immediate feedback
      set({ messages: [...messages, pendingMessage] });

      // Try Socket.IO first for instant delivery
      let socketSuccess = false;
      if (socket && socket.connected) {
        try {
          console.log("📤 Sending message via Socket.IO for instant delivery");

          // Send with acknowledgment for reliability
          const ackPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Socket timeout')), 5000);

            socket.emit("sendMessage", {
              ...messageData,
              receiverId: selectedUser._id,
              tempId: tempId
            }, (acknowledgment) => {
              clearTimeout(timeout);
              if (acknowledgment && acknowledgment.success) {
                resolve(acknowledgment);
              } else {
                reject(new Error(acknowledgment?.error || 'Socket send failed'));
              }
            });
          });

          const ack = await ackPromise;
          console.log("✅ Message sent via Socket.IO:", ack);

          // Replace temp message with server response and ensure proper sorting
          set(state => {
            const updatedMessages = state.messages.map(msg =>
              msg._id === tempId ? ack.message : msg
            );
            
            // Make sure messages are sorted by creation time
            const sortedMessages = [...updatedMessages].sort((a, b) => 
              new Date(a.createdAt) - new Date(b.createdAt)
            );
            
            return {
              messages: sortedMessages,
              lastMessageTimestamp: new Date(ack.message.createdAt).getTime()
            };
          });

          socketSuccess = true;
        } catch (socketError) {
          console.warn("⚠️ Socket.IO send failed, falling back to HTTP:", socketError);
        }
      }

      // Fallback to HTTP if Socket.IO failed or unavailable
      if (!socketSuccess) {
        console.log("📤 Sending message via HTTP");
        const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);

        // Replace pending message with server response and ensure proper sorting
        set(state => {
          const updatedMessages = state.messages
            .filter(msg => msg._id !== tempId)
            .concat(res.data);
          
          // Sort messages chronologically
          const sortedMessages = [...updatedMessages].sort((a, b) => 
            new Date(a.createdAt) - new Date(b.createdAt)
          );
          
          return {
            messages: sortedMessages,
            lastMessageTimestamp: new Date(res.data.createdAt).getTime()
          };
        });
      }

      // Refresh users list for sidebar update
      get().getUsers();

    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");

      // Update UI to show failed message with retry option
      set({
        messages: messages.map(msg =>
          msg.isPending ? { ...msg, status: 'failed', isPending: false } : msg
        )
      });

      // Try to reconnect if connection issues
      get().handleSocketReconnect();
    }
  },

  // Try to resend a failed message
  resendMessage: async (failedMessageId) => {
    const { messages, selectedUser } = get();
    const failedMessage = messages.find(msg => msg._id === failedMessageId);

    if (!failedMessage) return;

    // Remove the failed message from the list
    set({
      messages: messages.filter(msg => msg._id !== failedMessageId)
    });

    // Reconstruct message data
    const messageData = {
      text: failedMessage.text || "",
      image: failedMessage.image,
      mediaType: failedMessage.mediaType
    };

    // Send it again
    await get().sendMessage(messageData);
  },

  // Set reply target
  setReplyingTo: (message) => {
    set({ replyingTo: message });
  },

  // Clear reply target
  clearReplyingTo: () => {
    set({ replyingTo: null });
  },

  // Reply to a message
  replyToMessage: async (messageId, replyText, image = null, mediaType = null) => {
    const { selectedUser, replyingTo, messages } = get();

    try {
      // Optimistically update UI with pending reply message
      const tempId = `temp-reply-${Date.now()}`;
      const pendingReply = {
        _id: tempId,
        senderId: useAuthStore.getState().authUser._id,
        receiverId: selectedUser._id,
        text: replyText || "",
        image: image,
        mediaType: mediaType,
        replyTo: replyingTo, // Use the full replyingTo object
        isReply: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'sending',
        reactions: [],
        isPending: true
      };

      // Add pending reply to state
      set({ messages: [...messages, pendingReply] });

      const messageData = {
        text: replyText,
        image,
        mediaType,
        receiverId: selectedUser?._id
      };

      const res = await axiosInstance.post(`/messages/reply/${messageId}`, messageData);

      // Replace pending message with server response and ensure proper sorting
      set(state => {
        const updatedMessages = state.messages
          .filter(msg => msg._id !== tempId) // Remove temporary message
          .concat(res.data); // Add confirmed message
        
        // Sort messages chronologically
        const sortedMessages = [...updatedMessages].sort((a, b) => 
          new Date(a.createdAt) - new Date(b.createdAt)
        );
        
        return {
          messages: sortedMessages,
          replyingTo: null, // Clear reply state
          lastMessageTimestamp: new Date(res.data.createdAt).getTime()
        };
      });

      // Automatically refresh users list to update sidebar with latest conversation
      get().getUsers();

      return res.data;
    } catch (error) {
      console.error("Error replying to message:", error);
      toast.error("Failed to send reply");

      // Update UI to show failed message
      set({
        messages: messages.map(msg =>
          msg.isPending ? { ...msg, status: 'failed', isPending: false } : msg
        )
      });

      throw error;
    }
  },

  reactToMessage: async (messageId, emoji) => {
    try {
      // Optimistic update
      const currentMessages = get().messages;
      const userId = useAuthStore.getState().authUser._id;

      // Check if already reacted with same emoji
      const messageToUpdate = currentMessages.find(m => m._id === messageId);

      if (!messageToUpdate) return;

      const existingReactionWithSameEmoji = messageToUpdate.reactions?.find(
        r => r.userId === userId && r.emoji === emoji
      );

      let updatedReactions;

      if (existingReactionWithSameEmoji) {
        // Remove reaction
        updatedReactions = messageToUpdate.reactions.filter(
          r => !(r.userId === userId && r.emoji === emoji)
        );
      } else {
        // Remove any previous reaction from same user
        const filteredReactions = messageToUpdate.reactions?.filter(
          r => r.userId !== userId
        ) || [];

        // Add new reaction
        updatedReactions = [...filteredReactions, { userId, emoji }];
      }

      // Update message in state
      const updatedMessages = currentMessages.map(msg =>
        msg._id === messageId ? { ...msg, reactions: updatedReactions } : msg
      );

      set({ messages: updatedMessages });

      // Send to server
      await axiosInstance.post(`/messages/react/${messageId}`, { emoji });
      // The UI will be updated via the socket event
    } catch (error) {
      console.error("Error adding reaction:", error);
      toast.error(error.response?.data?.message || "Failed to add reaction");
      // Revert optimistic update by refreshing messages
      if (get().selectedUser) {
        get().getMessages(get().selectedUser._id);
      }
    }
  },

  markMessagesAsDelivered: (messageIds) => {
    if (!messageIds || messageIds.length === 0) return;

    console.log("📨 Marking messages as delivered:", messageIds);
    
    // Store messageIds for retry if needed
    set(state => ({ pendingDeliveredMessages: [...(state.pendingDeliveredMessages || []), ...messageIds] }));

    // First try via socket for real-time updates
    const socket = useAuthStore.getState().socket;
    if (socket && socket.connected) {
      socket.emit("messageDelivered", { messageIds });
    }

    // Always update via API for reliability, even if socket is connected
    axiosInstance.post("/messages/status/delivered", { messageIds })
      .then(() => {
        // Remove from pending list on success
        set(state => ({ 
          pendingDeliveredMessages: (state.pendingDeliveredMessages || [])
            .filter(id => !messageIds.includes(id))
        }));
      })
      .catch(error => {
        console.error("Error marking messages as delivered:", error);
        // Will retry on next connection via pendingDeliveredMessages
      });
      
    // Optimistic update in the UI
    const currentMessages = get().messages;
    const updatedMessages = currentMessages.map(message => {
      if (messageIds.includes(message._id) && message.status !== 'seen') {
        return {
          ...message,
          status: 'delivered',
          deliveredAt: new Date()
        };
      }
      return message;
    });
    
    set({ messages: updatedMessages });
  },

  markMessagesAsSeen: (messageIds) => {
    if (!messageIds || messageIds.length === 0) return;
    
    console.log("👁️ Marking messages as seen:", messageIds);
    
    // Store messageIds for retry if needed
    set(state => ({ pendingSeenMessages: [...(state.pendingSeenMessages || []), ...messageIds] }));

    // First try via socket for real-time updates
    const socket = useAuthStore.getState().socket;
    if (socket && socket.connected) {
      socket.emit("messageSeen", { messageIds });
    }

    // Always update via API for reliability, even if socket is connected
    axiosInstance.post("/messages/status/seen", { messageIds })
      .then(() => {
        // Remove from pending list on success
        set(state => ({ 
          pendingSeenMessages: (state.pendingSeenMessages || [])
            .filter(id => !messageIds.includes(id))
        }));
      })
      .catch(error => {
        console.error("Error marking messages as seen:", error);
        // Will retry on next connection via pendingSeenMessages
      });
    
    // Optimistic update in the UI
    const currentMessages = get().messages;
    const updatedMessages = currentMessages.map(message => {
      if (messageIds.includes(message._id)) {
        return {
          ...message,
          status: 'seen',
          seenAt: new Date()
        };
      }
      return message;
    });
    
    set({ messages: updatedMessages });
  },

  updateLastSeen: () => {
    // Send heartbeat to update last seen
    const socket = useAuthStore.getState().socket;
    if (socket && socket.connected) {
      socket.emit("heartbeat");
      // Also request updated statuses
      socket.emit("getUserStatuses");
    }

    // Also update via API for reliability
    axiosInstance.post("/messages/lastseen")
      .catch(error => console.error("Error updating last seen:", error));
  },

  deleteMessage: async (messageId, deleteType) => {
    set({ isDeletingMessage: true });

    try {
      // Optimistically update UI first
      const currentMessages = get().messages;

      // Update the messages in the UI
      const updatedMessages = currentMessages.map(message => {
        if (message._id === messageId) {
          return {
            ...message,
            isDeleted: true,
            deletedFor: deleteType,
            deletedAt: new Date()
          };
        }
        return message;
      });

      set({ messages: updatedMessages });

      // Call API to delete the message
      await axiosInstance.delete(`/messages/${messageId}`, {
        data: { deleteType }
      });

      // For 'everyone' deletion, remove the message entirely from UI after a delay
      if (deleteType === 'everyone') {
        // Wait a moment for the animation/transition
        setTimeout(() => {
          set(state => ({
            messages: state.messages.filter(m => m._id !== messageId)
          }));
        }, 3000);
      }

      // Emit socket event for real-time updates
      const socket = useAuthStore.getState().socket;
      if (socket && socket.connected) {
        socket.emit("messageDeleted", { messageId, deleteType });
      }

    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("Failed to delete message");

      // Revert changes if the deletion failed
      await get().getMessages(get().selectedUser._id);
    } finally {
      set({ isDeletingMessage: false });
    }
  },

  deleteAccount: async () => {
    try {
      const response = await axiosInstance.delete('/auth/delete-account');

      if (response.status !== 200) {
        throw new Error(response.data?.message || "Failed to delete account");
      }

      // Clear all local data
      set({
        messages: [],
        users: [],
        allUsers: [],
        selectedUser: null,
        unreadCounts: {}
      });

      // Call logout from auth store (this will clear the auth cookie)
      useAuthStore.getState().logout();

      toast.success("Your account has been deleted");
      return true;
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error(error.response?.data?.message || "Failed to delete account");
      return false;
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    const socket = useAuthStore.getState().socket;

    if (!socket) {
      console.error("Socket connection not available");
      set({ connectionStatus: 'disconnected' });
      return;
    }

    set({ connectionStatus: socket.connected ? 'connected' : 'connecting' });

    // Handle socket connection events
    socket.on('connect', () => {
      set({ connectionStatus: 'connected' });
      console.log("🔌 Socket connected successfully - ID:", socket.id);

      // Process any pending message status updates
      const pendingDelivered = get().pendingDeliveredMessages || [];
      const pendingSeen = get().pendingSeenMessages || [];
      const pendingEdits = get().pendingEdits || {};
      
      console.log("🔄 Processing pending updates on reconnection:", {
        pendingDeliveredCount: pendingDelivered.length,
        pendingSeenCount: pendingSeen.length,
        pendingEditsCount: Object.keys(pendingEdits).length
      });
      
      // Request updated online statuses immediately
      socket.emit("getUserStatuses");
      
      // Process pending delivered messages
      if (pendingDelivered.length > 0) {
        socket.emit("messageDelivered", { messageIds: pendingDelivered });
        console.log("📨 Re-sending pending delivered statuses:", pendingDelivered.length);
      }
      
      // Process pending seen messages
      if (pendingSeen.length > 0) {
        socket.emit("messageSeen", { messageIds: pendingSeen });
        console.log("�️ Re-sending pending seen statuses:", pendingSeen.length);
      }
      
      // Process pending message edits
      if (Object.keys(pendingEdits).length > 0) {
        console.log("✏️ Re-sending pending message edits");
        Object.entries(pendingEdits).forEach(([messageId, text]) => {
          socket.emit("messageEdited", { messageId, text });
        });
      }
      
      // Force a data refresh for all relevant data to ensure sync
      setTimeout(() => {
        // Refresh data with a slight delay to ensure socket connection is fully established
        get().getUsers();
        get().getUnreadCounts();
        
        if (get().selectedUser) {
          console.log("� Refreshing messages for current chat after reconnection");
          get().getMessages(get().selectedUser._id);
        }
      }, 300); // Short delay for better reliability

      // Refresh data after reconnection
      get().getUsers();
      get().getUnreadCounts();
      if (get().selectedUser) {
        console.log("🔄 Refreshing messages for current conversation with:", get().selectedUser.fullName);
        get().getMessages(get().selectedUser._id);
      }
    });

    socket.on('disconnect', () => {
      console.log("Socket disconnected");
      set({ connectionStatus: 'disconnected' });
    });

    socket.on('connect_error', (error) => {
      console.error("Socket connection error:", error);
      set({ connectionStatus: 'disconnected' });
    });

    // Listen for new regular messages
    socket.on("newMessage", (newMessage) => {
      console.log("📨 Received new message via Socket.IO:", newMessage);
      const currentUserId = useAuthStore.getState().authUser._id;
      const currentSelectedUser = get().selectedUser;

      // Check if this is a reply message
      if (newMessage.isReply || newMessage.replyTo) {
        console.log("💬 This is a reply message:", newMessage.replyTo);
      }

      // Extract sender ID (handle both string and object formats)
      const messageSenderId = typeof newMessage.senderId === 'object'
        ? newMessage.senderId._id
        : newMessage.senderId;

      console.log("🔍 Message sender ID:", messageSenderId);
      console.log("🔍 Current user ID:", currentUserId);
      console.log("🔍 Selected user ID:", currentSelectedUser?._id);

      // Play notification sound for new messages if the sender is not the current user
      if (messageSenderId !== currentUserId) {
        try {
          const notificationSound = new Audio('/sounds/message.mp3');
          notificationSound.volume = 0.5;
          notificationSound.play().catch(e => console.log("Audio play error:", e));
        } catch (error) {
          console.error("Error playing notification sound:", error);
        }
      }

      // If sender is the selected user, add to current messages
      if (currentSelectedUser && messageSenderId === currentSelectedUser._id) {
        console.log("✅ Adding message to current conversation (sender is selected user)");
        // Update last message timestamp for polling comparison
        set(state => {
          // Sort messages chronologically after adding new message
          const updatedMessages = [...state.messages.filter(m => m._id !== newMessage._id), newMessage]
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          
          return {
            messages: updatedMessages,
            lastMessageTimestamp: new Date(newMessage.createdAt).getTime()
          };
        });

        // Mark message as delivered immediately
        get().markMessagesAsDelivered([newMessage._id]);

        // Mark message as seen after a short delay (simulating reading time)
        setTimeout(() => {
          get().markMessagesAsSeen([newMessage._id]);
        }, 1000);

        // Also mark the chat as read to clear unread badges
        get().markChatAsRead('direct', messageSenderId);
      }
      // If we're the receiver but not on this chat, handle unread count
      else if (newMessage.receiverId === currentUserId) {
        console.log("📬 Received message from different user, updating sidebar");
        
        // Show a toast notification for the new message
        if (messageSenderId !== currentUserId) {
          try {
            // Find the sender's information from users list
            const sender = get().users.find(u => u._id === messageSenderId) || 
                          get().allUsers.find(u => u._id === messageSenderId);
            if (sender) {
              const senderName = sender.fullName || sender.username;
              const messagePreview = newMessage.text ? 
                (newMessage.text.length > 30 ? `${newMessage.text.slice(0, 30)}...` : newMessage.text) : 
                (newMessage.image ? 'Sent an image' : 'New message');
                
              toast.success(`${senderName}: ${messagePreview}`, {
                duration: 4000,
                position: 'top-right',
                icon: '💬'
              });
            }
          } catch (error) {
            console.error("Error showing notification toast:", error);
          }
        }
        
        // Force update the users list to show the latest message in the sidebar
        get().getUsers();

        // The unread counts will be updated via socket event "unreadCountUpdate"
        // No need to manually call getUnreadCounts() here
      }
      // If we're the sender of this message in a different tab/window
      else if (messageSenderId === currentUserId) {
        console.log("📤 Received own message from different tab/window");
        // If we're viewing the conversation with the recipient
        if (currentSelectedUser && newMessage.receiverId === currentSelectedUser._id) {
          console.log("✅ Adding own message to current conversation (multi-device sync)");
          set(state => {
            // Sort messages chronologically after adding new message
            const updatedMessages = [...state.messages.filter(m => m._id !== newMessage._id), newMessage]
              .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            
            return {
              messages: updatedMessages,
              lastMessageTimestamp: new Date(newMessage.createdAt).getTime()
            };
          });
        }

        // Update users list to show latest conversation
        get().getUsers();
      }

      console.log("🔄 Finished processing new message");
    });

    // Listen for new chats (first message from someone)
    socket.on("newChat", ({ message, user }) => {
      console.log("🆕 Received new chat via Socket.IO:", { message, user });
      // Add the new user to our users list
      const currentUsers = get().users;
      const currentUserId = useAuthStore.getState().authUser._id;
      const currentSelectedUser = get().selectedUser;

      // Extract sender ID (handle both string and object formats)
      const messageSenderId = typeof message.senderId === 'object'
        ? message.senderId._id
        : message.senderId;

      // Check if user already exists in users list
      const userExists = currentUsers.some(existingUser => existingUser._id === user._id);

      if (!userExists) {
        console.log("✅ Adding new user to users list:", user.fullName);
        set({ users: [...currentUsers, user] });
      }

      // If this is the selected user, add message to current messages
      if (currentSelectedUser &&
         (messageSenderId === currentSelectedUser._id || message.receiverId === currentSelectedUser._id)) {
        console.log("✅ Adding new chat message to current conversation");
        set(state => {
          // Sort messages chronologically after adding new message
          const updatedMessages = [...state.messages.filter(m => m._id !== message._id), message]
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          
          return {
            messages: updatedMessages,
            lastMessageTimestamp: new Date(message.createdAt).getTime()
          };
        });

        // Mark as delivered and seen if we're the receiver
        if (message.receiverId === currentUserId) {
          get().markMessagesAsDelivered([message._id]);
          setTimeout(() => {
            get().markMessagesAsSeen([message._id]);
          }, 1000);
        }
      }
      // If we're the receiver but not on this chat, the backend will handle unread count increment
      // and emit unreadCountUpdate event which we listen to below
      else if (message.receiverId === currentUserId) {
        console.log("📬 Received new message from different user - unread count will be updated via Socket.IO");
      }

      // Refresh the users list to update sidebar with latest message info
      get().getUsers();
    });

    // Listen for refreshChats events from the server
    socket.on("refreshChats", () => {
      get().getUsers();

      // If a chat is currently open, refresh messages
      if (get().selectedUser) {
        get().getMessages(get().selectedUser._id);
      }
    });

    // Listen for message reactions
    socket.on("messageReaction", ({ messageId, reactions }) => {
      const currentMessages = get().messages;

      // Update the specific message with new reactions
      const updatedMessages = currentMessages.map(message =>
        message._id === messageId
          ? { ...message, reactions }
          : message
      );

      set({ messages: updatedMessages });
    });

    // Listen for message status updates
    socket.on("messageStatusUpdate", ({ messageIds, status, timestamp }) => {
      console.log(`🔄 Received status update for ${messageIds.length} messages: ${status}`);
      
      const currentMessages = get().messages;
      if (!currentMessages || currentMessages.length === 0) {
        console.log("⚠️ No messages in state to update");
        return;
      }

      // Only update messages that exist in our state and follow proper status progression
      const updatedMessages = currentMessages.map(message => {
        if (messageIds.includes(message._id)) {
          // Only update status if it's a logical progression
          // (sent -> delivered -> seen, never backwards)
          const shouldUpdate = (
            (status === 'delivered' && message.status === 'sent') || 
            (status === 'seen' && (message.status === 'sent' || message.status === 'delivered'))
          );

          if (shouldUpdate) {
            return {
              ...message,
              status,
              ...(status === 'delivered' ? { deliveredAt: new Date(timestamp) } : {}),
              ...(status === 'seen' ? { seenAt: new Date(timestamp) } : {})
            };
          }
          
          // If message is already in a "higher" state, log and don't downgrade
          if ((status === 'delivered' && message.status === 'seen') ||
              (status === 'sent' && (message.status === 'delivered' || message.status === 'seen'))) {
            console.log(`⚠️ Ignoring status downgrade for message ${message._id}: ${message.status} -> ${status}`);
            return message;
          }
        }
        return message;
      });

      // Only update state if there are actual changes
      if (JSON.stringify(currentMessages) !== JSON.stringify(updatedMessages)) {
        console.log("✅ Updating message statuses in state");
        set({ messages: updatedMessages });
      } else {
        console.log("ℹ️ No status changes needed");
      }

      // Also update group messages if we're in a group chat
      const { selectedGroup, groupMessages } = useGroupStore.getState();
      if (selectedGroup && groupMessages && groupMessages.length > 0) {
        const updatedGroupMessages = groupMessages.map(message => {
          if (messageIds.includes(message._id)) {
            // Same progression logic as above
            const shouldUpdate = (
              (status === 'delivered' && message.status === 'sent') || 
              (status === 'seen' && (message.status === 'sent' || message.status === 'delivered'))
            );

            if (shouldUpdate) {
              return {
                ...message,
                status,
                ...(status === 'delivered' ? { deliveredAt: new Date(timestamp) } : {}),
                ...(status === 'seen' ? { seenAt: new Date(timestamp) } : {})
              };
            }
          }
          return message;
        });

        if (JSON.stringify(groupMessages) !== JSON.stringify(updatedGroupMessages)) {
          useGroupStore.setState({ groupMessages: updatedGroupMessages });
        }
      }
    });

    // Listen for user status updates
    socket.on("userStatusUpdate", ({ userId, isOnline, lastSeen }) => {
      set(state => ({
        userStatuses: {
          ...state.userStatuses,
          [userId]: { isOnline, lastSeen }
        }
      }));
    });

    // Listen for initial user statuses
    socket.on("initialUserStatuses", (statuses) => {
      set({ userStatuses: statuses });
    });

    // Listen for unread count updates
    socket.on("unreadCountUpdate", (unreadCounts) => {
      console.log("📊 Received real-time unread count update:", unreadCounts);
      set({ unreadCounts });

      // Force refresh users list to update sidebar with new unread counts
      setTimeout(() => {
        get().getUsers();
      }, 100);
    });

    // Listen for mention notifications
    socket.on("userMentioned", ({ messageId, groupId, senderName, groupName, timestamp }) => {
      console.log("🏷️ Received mention notification:", { messageId, groupId, senderName, groupName });

      // Update mention counts (this will be overridden by unreadCountUpdate event from backend)
      set(state => ({
        unreadCounts: {
          ...state.unreadCounts,
          mentions: {
            ...state.unreadCounts.mentions,
            [groupId]: (state.unreadCounts.mentions?.[groupId] || 0) + 1
          },
          totalMentions: (state.unreadCounts.totalMentions || 0) + 1
        }
      }));

      // Show notification
      toast.info(`${senderName} mentioned you in ${groupName || 'a group'}`);

      // Force refresh groups list to update sidebar
      setTimeout(() => {
        get().getUsers();
      }, 100);
    });

    // Listen for new status updates
    socket.on("newStatus", (statusData) => {
      console.log("📱 Received new status via Socket.IO:", statusData);
      const { handleNewStatus } = useStatusStore.getState();
      handleNewStatus(statusData);
    });

    // Listen for status reactions
    socket.on("statusReaction", (reactionData) => {
      console.log("👍 Received status reaction via Socket.IO:", reactionData);
      const { handleStatusReaction } = useStatusStore.getState();
      handleStatusReaction(reactionData);
    });

    // Listen for status messages
    socket.on("statusMessage", (messageData) => {
      console.log("💬 Received status message via Socket.IO:", messageData);
      const { handleStatusMessage } = useStatusStore.getState();
      handleStatusMessage(messageData);
    });

    // Listen for message deleted events
    socket.on("messageDeleted", ({ messageId, deleteType, groupId }) => {
      console.log("🗑️ Received message deletion event:", { messageId, deleteType, groupId });
      const currentMessages = get().messages;
      
      if (!currentMessages || currentMessages.length === 0) {
        console.log("⚠️ No messages in state to delete");
        return;
      }
      
      // Check if the message exists in our current state
      const existingMessageIndex = currentMessages.findIndex(msg => msg._id === messageId);
      if (existingMessageIndex === -1) {
        console.log("⚠️ Message to delete not found in current state:", messageId);
        return;
      }
      
      if (deleteType === 'everyone') {
        console.log("🌍 Processing delete for everyone");
        // For delete for everyone, mark the message as deleted with visual indication
        const updatedMessages = currentMessages.map(message => {
          if (message._id === messageId) {
            return {
              ...message,
              isDeleted: true,
              deletedFor: deleteType,
              deletedAt: new Date(),
              text: '', // Clear text content
              image: null // Remove image reference
            };
          }
          return message;
        });

        set({ messages: updatedMessages });
        console.log("✅ Updated message as deleted for everyone");
        
        // Optionally remove the message completely after a delay
        // to improve user experience by showing "This message was deleted" for a while
        setTimeout(() => {
          set(state => ({
            messages: state.messages.filter(m => m._id !== messageId)
          }));
          console.log("🧹 Removed deleted message from UI after delay");
        }, 30000); // Keep for 30 seconds before removing
      } else {
        // For delete for me, just mark as deleted locally
        const updatedMessages = currentMessages.map(message => {
          if (message._id === messageId) {
            return {
              ...message,
              isDeleted: true,
              deletedFor: deleteType,
              deletedAt: new Date()
            };
          }
          return message;
        });

        set({ messages: updatedMessages });
      }

      // Update users list to reflect changes in recent messages
      get().getUsers();
    });

    // Listen for message editing
    socket.on("messageEdited", (updatedMessage) => {
      console.log("✏️ Received edited message update:", updatedMessage._id);
      const currentMessages = get().messages;
      
      if (!currentMessages || currentMessages.length === 0) {
        console.log("⚠️ No messages in state to update after edit");
        return;
      }
      
      // Make sure the updated message has proper timestamps as Date objects
      if (updatedMessage.createdAt && typeof updatedMessage.createdAt === 'string') {
        updatedMessage.createdAt = new Date(updatedMessage.createdAt);
      }
      if (updatedMessage.updatedAt && typeof updatedMessage.updatedAt === 'string') {
        updatedMessage.updatedAt = new Date(updatedMessage.updatedAt);
      }
      if (updatedMessage.editedAt && typeof updatedMessage.editedAt === 'string') {
        updatedMessage.editedAt = new Date(updatedMessage.editedAt);
      }
      
      // Check if the message exists in our current state
      const existingMessage = currentMessages.find(msg => msg._id === updatedMessage._id);
      
      if (!existingMessage) {
        console.log("⚠️ Edited message not found in current state:", updatedMessage._id);
        return;
      }
      
      // Update the specific message
      const updatedMessages = currentMessages.map(message =>
        message._id === updatedMessage._id ? {
          ...updatedMessage,
          // Preserve status information that might not be in the update
          status: message.status || updatedMessage.status,
          deliveredAt: message.deliveredAt || updatedMessage.deliveredAt,
          seenAt: message.seenAt || updatedMessage.seenAt,
        } : message
      );

      // Remove from pending edits if it exists
      if (get().pendingEdits?.[updatedMessage._id]) {
        set(state => {
          const newPendingEdits = { ...(state.pendingEdits || {}) };
          delete newPendingEdits[updatedMessage._id];
          return { 
            messages: updatedMessages,
            pendingEdits: newPendingEdits
          };
        });
      } else {
        set({ messages: updatedMessages });
      }
      
      console.log("✅ Updated edited message in state");
    });

    // Request initial user statuses when connected
    if (socket.connected) {
      socket.emit("getUserStatuses");
    }

    // Start heartbeat interval to update last seen (reduced frequency)
    const heartbeatInterval = setInterval(() => {
      get().updateLastSeen();

      // Also periodically request user statuses (unread counts are handled via real-time events)
      if (socket.connected) {
        socket.emit("getUserStatuses");
      }
    }, 60000); // Every 60 seconds (reduced from 15 seconds)

    // Set up periodic polling for new messages as a backup to sockets
    const messagePollingInterval = setInterval(() => {
      // Check if we have an active conversation and either:
      // 1. Socket is disconnected, OR
      // 2. It's been more than 15 seconds since our last message update
      const selectedUser = get().selectedUser;
      const connectionStatus = get().connectionStatus;
      const lastMessageTimestamp = get().lastMessageTimestamp;
      const now = Date.now();
      
      if (selectedUser && (
        connectionStatus !== 'connected' || 
        (lastMessageTimestamp && (now - lastMessageTimestamp > 15000))
      )) {
        console.log("🔄 Polling for new messages as backup mechanism");
        // Re-fetch messages for current conversation
        get().getMessages(selectedUser._id);
      }
    }, 8000); // Poll every 8 seconds when needed

    // Store the interval IDs for cleanup
    set({
      heartbeatInterval,
      messagePollingInterval
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("newMessage");
      socket.off("newChat");
      socket.off("messageReaction");
      socket.off("messageStatusUpdate");
      socket.off("userStatusUpdate");
      socket.off("unreadCountUpdate");
      socket.off("messageDeleted");
      socket.off("refreshChats");
      socket.off("messageEdited");
      socket.off("newStatus");
      socket.off("statusReaction");
      socket.off("statusMessage");
    }

    // Clear heartbeat interval
    if (get().heartbeatInterval) {
      clearInterval(get().heartbeatInterval);
    }

    // Clear message polling interval
    if (get().messagePollingInterval) {
      clearInterval(get().messagePollingInterval);
    }
  },

  setSelectedUser: (selectedUser) => {
    set({ selectedUser });

    // If selecting a user, mark all their messages as seen
    if (selectedUser) {
      const messagesToMark = get().messages
        .filter(msg =>
          msg.senderId === selectedUser._id &&
          msg.receiverId === useAuthStore.getState().authUser._id &&
          msg.status !== 'seen'
        )
        .map(msg => msg._id);

      if (messagesToMark.length > 0) {
        get().markMessagesAsSeen(messagesToMark);
      }

      // Mark chat as read using WhatsApp-style system
      get().markChatAsRead('direct', selectedUser._id);

      // Check connection status and reconnect if needed
      if (get().connectionStatus !== 'connected') {
        get().handleSocketReconnect();
      } else {
        // Request updated status for this user
        const socket = useAuthStore.getState().socket;
        if (socket && socket.connected) {
          socket.emit("getUserStatus", { userId: selectedUser._id });
        }
      }
    }
  },

  getLastSeen: (userId) => {
    const status = get().userStatuses[userId];
    if (!status) return null;
    return status;
  },

  editMessage: async (messageId, text) => {
    try {
      // Check if message can be edited (within 15 minutes)
      const message = get().messages.find(m => m._id === messageId);

      if (!message) {
        toast.error("Message not found");
        return false;
      }

      // Only the sender can edit
      if (message.senderId !== useAuthStore.getState().authUser._id) {
        toast.error("You can only edit your own messages");
        return false;
      }

      // Check if already deleted
      if (message.isDeleted) {
        toast.error("Cannot edit a deleted message");
        return false;
      }

      // Check if within 15 minutes
      const messageDate = new Date(message.createdAt);
      const now = new Date();
      const minutesDiff = (now - messageDate) / (1000 * 60);

      if (minutesDiff > 15) {
        toast.error("Cannot edit messages after 15 minutes");
        return false;
      }

      // Store edit in pending edits
      set(state => ({
        pendingEdits: {
          ...(state.pendingEdits || {}),
          [messageId]: text
        }
      }));

      // Optimistically update UI
      const currentMessages = get().messages;
      const updatedMessages = currentMessages.map(msg => {
        if (msg._id === messageId) {
          return {
            ...msg,
            text,
            isEdited: true,
            editedAt: new Date(),
            originalText: !msg.isEdited ? msg.text : msg.originalText
          };
        }
        return msg;
      });

      set({ messages: updatedMessages });
      
      // Try socket first for immediate real-time updates
      const socket = useAuthStore.getState().socket;
      let socketSuccess = false;
      
      if (socket && socket.connected) {
        try {
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Socket timeout")), 3000);
            
            socket.emit("messageEdited", { messageId, text }, (ack) => {
              clearTimeout(timeout);
              if (ack && ack.success) {
                resolve(true);
              } else {
                reject(new Error(ack?.error || "Socket edit failed"));
              }
            });
          });
          socketSuccess = true;
          console.log("✅ Message edited via socket successfully");
        } catch (socketError) {
          console.warn("⚠️ Socket edit failed, falling back to HTTP:", socketError);
        }
      }
      
      // Always call API for reliability
      const res = await axiosInstance.put(`/messages/${messageId}`, { text });
      
      // Remove from pending edits
      set(state => {
        const newPendingEdits = { ...(state.pendingEdits || {}) };
        delete newPendingEdits[messageId];
        return { pendingEdits: newPendingEdits };
      });

      return true;
    } catch (error) {
      console.error("Error editing message:", error);
      toast.error(error.response?.data?.message || "Failed to edit message");

      // Keep in pending edits for retry
      setTimeout(() => {
        // Retry edit if socket reconnects
        const socket = useAuthStore.getState().socket;
        if (socket && socket.connected) {
          const pendingText = get().pendingEdits?.[messageId];
          if (pendingText) {
            socket.emit("messageEdited", { messageId, text: pendingText });
          }
        }
      }, 5000);

      return false;
    }
  }
}));