import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,
  googleAuthInfo: null, // Store Google info temporarily when username is needed
  socketReconnectAttempts: 0,
  socketReconnectTimer: null,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");

      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);

      // Login success - 2FA is no longer enforced during login
      set({ authUser: res.data });
      toast.success("Logged in successfully");
      get().connectSocket();
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
      return { error: true };
    } finally {
      set({ isLoggingIn: false });
    }
  },

  loginWithGoogle: async (credential) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/google", { credential });

      // Check if we need to collect a username
      if (res.data.needsUsername) {
        set({
          googleAuthInfo: {
            credential,
            ...res.data.googleInfo
          },
          isLoggingIn: false
        });
        toast.success("Please create a username to complete your account");
        return { needsUsername: true };
      }

      // Regular login success
      set({
        authUser: res.data,
        googleAuthInfo: null // Clear any existing google auth info
      });
      toast.success("Logged in successfully");

      get().connectSocket();
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Google login failed";
      toast.error(errorMessage);
      throw error;
    } finally {
      set({ isLoggingIn: false });
    }
  },

  completeGoogleSignup: async (username) => {
    const { googleAuthInfo } = get();

    if (!googleAuthInfo || !googleAuthInfo.credential) {
      toast.error("Google authentication information is missing");
      return false;
    }

    set({ isSigningUp: true });

    try {
      const res = await axiosInstance.post("/auth/google", {
        credential: googleAuthInfo.credential,
        username
      });

      set({
        authUser: res.data,
        googleAuthInfo: null  // Clear google auth info after successful signup
      });

      toast.success("Account created successfully");
      get().connectSocket();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to complete Google signup");
      return false;
    } finally {
      set({ isSigningUp: false });
    }
  },

  // Generate token after 2FA verification
  generateToken: (userId) => {
    // This is called after successful 2FA verification
    // The backend has already set the JWT cookie
    // We just need to check auth to get the user data
    get().checkAuth();
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({
        authUser: null,
        googleAuthInfo: null // Also clear google auth info on logout
      });
      toast.success("Logged out successfully");
      get().disconnectSocket();
      return true; // Return success status
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to logout";
      toast.error(errorMessage);
      console.error("Logout error:", error);
      throw error; // Rethrow the error to be caught by the caller
    }
  },

  updateProfile: async (userData) => {
    try {
      set({ isUpdatingProfile: true });

      const res = await axiosInstance.put("/auth/update-profile", userData);

      // Update authUser with the returned user data
      set({
        authUser: res.data,
        isUpdatingProfile: false
      });

      toast.success("Profile updated!");
      return true;
    } catch (error) {
      set({ isUpdatingProfile: false });
      toast.error(error.response?.data?.message || "Failed to update profile");
      return false;
    }
  },

  connectSocket: () => {
    const { authUser } = get();
    if (!authUser) return;

    // Clear any existing reconnect timer
    if (get().socketReconnectTimer) {
      clearTimeout(get().socketReconnectTimer);
      set({ socketReconnectTimer: null });
    }

    // If there's an existing connected socket, don't create a new one
    if (get().socket?.connected) return;

    // Disconnect any existing socket
    if (get().socket) {
      get().socket.disconnect();
    }

    // Determine the appropriate socket URL based on environment
    const isProduction = import.meta.env.MODE === "production";
    const socketURL = isProduction ? "/" : BASE_URL;
    
    console.log(`🔌 Connecting to Socket.IO server at: ${socketURL}`);

    // Create new socket with optimized real-time settings
    const socket = io(socketURL, {
      query: {
        userId: authUser._id,
        clientTime: new Date().toISOString() // Send client time for synchronization
      },
      // Enhanced reconnection settings for better real-time reliability
      reconnection: true,
      reconnectionAttempts: 20,        // More attempts for persistence
      reconnectionDelay: 300,          // Faster initial reconnect
      reconnectionDelayMax: 2000,      // Lower max delay for better responsiveness
      timeout: 8000,                   // Faster timeout
      forceNew: false,                 // Reuse existing connection
      
      // More aggressive transport optimization
      transports: ['websocket', 'polling'], // Prefer websocket but allow polling fallback
      upgrade: true,                   // Allow transport upgrades
      rememberUpgrade: true,           // Remember successful upgrades
      
      // Performance settings
      autoConnect: true,               // Auto connect on creation
      multiplex: true,                 // Allow multiplexing
      
      // Explicit path and other optimizations
      path: '/socket.io',
      withCredentials: true            // Include credentials for cross-domain support
    });

    set({ socket: socket });

    // Connect handlers
    socket.on("connect", () => {
      console.log("✅ Socket connected successfully, ID:", socket.id);
      // Reset reconnect attempts on successful connection
      set({ socketReconnectAttempts: 0 });

      // Get initial online users and request statuses
      socket.emit("getOnlineUsers");
      socket.emit("getUserStatuses");
      
      // Set up a heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        if (socket.connected) {
          socket.emit("heartbeat");
        } else {
          clearInterval(heartbeatInterval);
        }
      }, 30000); // Send heartbeat every 30 seconds
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      get().handleSocketReconnect();
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);

      // Inform other stores about disconnection
      try {
        // Update the chat store connection status without triggering a reconnect loop
        import('./useChatStore').then(module => {
          const useChatStore = module.useChatStore;
          if (useChatStore) {
            useChatStore.setState({ connectionStatus: 'disconnected' });
          }
        }).catch(err => console.error("Failed to update chat store:", err));
      } catch (error) {
        console.error("Error updating connection status in other stores:", error);
      }

      // If the disconnection wasn't intentional, try to reconnect
      // But avoid reconnecting for certain reasons to prevent infinite reconnection loops
      const intentionalDisconnects = ["io client disconnect", "forced close"];
      if (!intentionalDisconnects.includes(reason)) {
        // Use exponential backoff based on number of attempts
        const attempts = get().socketReconnectAttempts;
        const backoffDelay = Math.min(1000 * Math.pow(1.5, attempts), 10000); // Cap at 10 seconds
        
        console.log(`Will attempt reconnection in ${backoffDelay}ms (attempt ${attempts + 1})`);
        
        setTimeout(() => {
          get().handleSocketReconnect();
        }, backoffDelay);
      }
    });

    // Event listeners
    socket.on("getOnlineUsers", (userIds) => {
      console.log("📊 Received online users:", userIds.length);
      set({ onlineUsers: userIds });
    });

    // Connect the socket
    socket.connect();
  },

  handleSocketReconnect: () => {
    const currentAttempts = get().socketReconnectAttempts;
    const { authUser } = get();
    
    // Update UI status first to provide immediate feedback
    try {
      import('./useChatStore').then(module => {
        const useChatStore = module.useChatStore;
        if (useChatStore) {
          useChatStore.setState({ connectionStatus: 'connecting' });
        }
      }).catch(err => console.error("Failed to update chat store:", err));
    } catch (error) {
      console.error("Error updating connection status:", error);
    }
    
    // Don't try to reconnect if user is not logged in
    if (!authUser) {
      console.log("Not attempting to reconnect socket - user not logged in");
      return;
    }

    // If we've tried too many times, stop trying frequently but keep trying occasionally
    if (currentAttempts >= 15) {
      console.log("Maximum socket reconnection attempts reached, switching to longer interval");
      // Clear any existing timer
      if (get().socketReconnectTimer) {
        clearTimeout(get().socketReconnectTimer);
      }
      
      // Try one more time after a longer delay (30s)
      const timer = setTimeout(() => {
        console.log("Making one more reconnection attempt after timeout");
        get().connectSocket();
        
        // Reset attempts to allow reconnection attempts to start over
        set({ socketReconnectAttempts: 5 });
      }, 30000);
      
      set({ socketReconnectTimer: timer });
      return;
    }

    // Clear any existing timer
    if (get().socketReconnectTimer) {
      clearTimeout(get().socketReconnectTimer);
    }

    // Increase backoff time with each attempt using a different formula
    // This gives more attempts at first but slower later
    const delay = Math.min(1000 * Math.pow(1.3, currentAttempts), 15000);

    console.log(`Will attempt to reconnect socket in ${delay/1000} seconds (attempt ${currentAttempts + 1})`);

    // Set up new reconnect timer
    const timer = setTimeout(() => {
      console.log(`🔄 Attempting to reconnect socket (attempt ${currentAttempts + 1})`);
      
      // Only try to disconnect the socket if it exists and isn't connected
      if (get().socket && !get().socket.connected) {
        try {
          // Instead of disconnecting, try to re-use the existing socket
          get().socket.connect();
          console.log("Attempting to reconnect existing socket");
        } catch (error) {
          console.error("Error reconnecting socket:", error);
          
          // If reconnection fails, try to create a new socket
          get().connectSocket();
        }
      } else {
        // Create a new socket
        get().connectSocket();
      }
    }, delay);

    set({
      socketReconnectAttempts: currentAttempts + 1,
      socketReconnectTimer: timer
    });
  },

  disconnectSocket: () => {
    // Clear any reconnect timer
    if (get().socketReconnectTimer) {
      clearTimeout(get().socketReconnectTimer);
      set({ socketReconnectTimer: null });
    }

    // Disconnect socket
    if (get().socket) {
      get().socket.disconnect();
      set({ socket: null, socketReconnectAttempts: 0 });
    }
  },
}));
