import ErrorBoundary from "./components/ErrorBoundary";
import MobileRedirectScreen from "./components/MobileRedirectScreen";

import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import SecuritySettings from "./components/SecuritySettings";
import ProfilePage from "./pages/ProfilePage";
import OTPVerificationPage from "./pages/OTPVerificationPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import JoinGroupPage from "./pages/JoinGroupPage";
import ReportThanksPage from "./pages/ReportThanksPage";

import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore, getThemeVariables } from "./store/useThemeStore";
import { useChatStore } from "./store/useChatStore";
import { useGroupStore } from "./store/useGroupStore";
import { useAIStore } from "./store/useAIStore";
import { useEffect, useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { HelmetProvider } from 'react-helmet-async';
import { initializeEncryption } from "./utils/encryption";
import { getGoogleClientId } from "./config/environment";
import "./components/skeleton-styles.css";

import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth, onlineUsers } = useAuthStore();
  const { theme, autoThemeEnabled, checkAutoTheme, setTheme, themeVariables } = useThemeStore();
  const { subscribeToMessages, unsubscribeFromMessages, getUnreadCounts } = useChatStore();
  const { subscribeToGroupEvents, unsubscribeFromGroupEvents } = useGroupStore();
  const { deselectAI } = useAIStore();
  const [isMobile, setIsMobile] = useState(false);
  
  // Initialize the theme on load
  useEffect(() => {
    // Don't override the existing theme choice, let the theme system handle it
    // This ensures proper theme application based on user preferences or auto settings
  }, []);
  
  // Make sure AI is deselected on app load
  useEffect(() => {
    deselectAI();
  }, []);

  console.log({ onlineUsers });

  useEffect(() => {
    checkAuth();
    
    // Check if device is mobile or tablet (including iPad Pro)
    const checkMobileDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      
      // Enhanced function to detect iPad Pro specifically 
      // (which might identify as Mac in newer versions)
      const isIPadPro = () => {
        // iPad Pro often identifies as Mac in newer OS versions but has touch support
        const isTouchDevice = 'ontouchend' in document;
        const isMacLike = /(mac|darwin)/i.test(userAgent);
        const hasMultiTouch = window.navigator.maxTouchPoints > 2;
        
        // Check for iPad Pro specific dimensions
        const hasIpadDimensions = (
          // iPad Pro 11-inch and 12.9-inch dimensions in portrait or landscape
          (window.innerWidth === 834 && window.innerHeight === 1194) ||
          (window.innerWidth === 1194 && window.innerHeight === 834) ||
          (window.innerWidth === 1024 && window.innerHeight === 1366) ||
          (window.innerWidth === 1366 && window.innerHeight === 1024)
        );
        
        return (isTouchDevice && isMacLike && hasMultiTouch) || hasIpadDimensions;
      };
      
      // Enhanced regex to catch all mobile and tablet devices
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|windows phone|tablet|kindle|silk|mobile|crios|firefox.*mobile|opera.*mobile/i;
      
      // Additional check for the newer iPad Pro models that identify as desktop Safari
      const isPadOSBasedOnRatio = () => {
        // These checks help identify iPad OS devices by their aspect ratios and touch capabilities
        const aspectRatio = window.innerWidth / window.innerHeight;
        const isPadAspectRatio = (aspectRatio > 0.65 && aspectRatio < 0.85) || 
                                 (aspectRatio > 1.18 && aspectRatio < 1.55);
        
        return window.navigator.maxTouchPoints > 0 && 
               isPadAspectRatio && 
               window.innerWidth >= 768 && 
               window.innerWidth <= 1366;
      };

      // Detect by:
      // 1. User agent pattern matching
      // 2. iPad Pro specific detection
      // 3. Small screen size (below typical desktop)
      // 4. Touch capability + screen size typical for tablets
      // 5. iPad OS aspect ratio + touch detection
      setIsMobile(
        mobileRegex.test(userAgent) || 
        isIPadPro() || 
        window.innerWidth < 1024 || 
        (window.navigator.maxTouchPoints > 0 && window.innerWidth < 1366) || // Likely a tablet if touch-enabled and under typical desktop width
        isPadOSBasedOnRatio()
      );
    };
    
    checkMobileDevice();
    window.addEventListener('resize', checkMobileDevice);
    
    return () => {
      window.removeEventListener('resize', checkMobileDevice);
    };
  }, [checkAuth]);

  // Initialize encryption when user is authenticated
  useEffect(() => {
    if (authUser) {
      // Store current user ID for encryption
      localStorage.setItem('currentUserId', authUser._id);

      initializeEncryption().then(() => {
        console.log('Encryption initialized successfully');
      }).catch(error => {
        console.error('Failed to initialize encryption:', error);
      });
    }
  }, [authUser]);

  // Subscribe to real-time messages and group events when logged in
  useEffect(() => {
    if (authUser) {
      subscribeToMessages();
      subscribeToGroupEvents();
      // Fetch initial unread counts
      getUnreadCounts();
      // Ensure AI is deselected when logging in
      deselectAI();
    }

    return () => {
      if (authUser) {
        unsubscribeFromMessages();
        unsubscribeFromGroupEvents();
      }
    };
  }, [authUser, subscribeToMessages, unsubscribeFromMessages, subscribeToGroupEvents, unsubscribeFromGroupEvents, getUnreadCounts, deselectAI]);

  // Set up automatic theme checking
  useEffect(() => {
    // Check theme immediately on app load
    checkAutoTheme();

    // Set up an interval to check every minute
    const themeCheckInterval = setInterval(() => {
      if (autoThemeEnabled) {
        checkAutoTheme();
      }
    }, 60000); // Check every minute

    return () => clearInterval(themeCheckInterval);
  }, [autoThemeEnabled, checkAutoTheme]);

  console.log({ authUser });

  if (isCheckingAuth && !authUser)
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );

  // Show mobile redirect screen for mobile devices
  if (isMobile) {
    return <MobileRedirectScreen />;
  }

  return (
    <GoogleOAuthProvider clientId={getGoogleClientId()}>
      <HelmetProvider>
        <div 
          data-theme={theme === "light" ? "light" : "dark"} 
          style={{
            // Apply CSS variables for theme colors
            ...(themeVariables ? Object.entries(themeVariables).reduce((acc, [key, value]) => {
              acc[`--color-${key}`] = value;
              return acc;
            }, {}) : {})
          }}
        >
          <Routes>
          <Route path="/" element={authUser ? <HomePage /> : <Navigate to="/login" />} />
          <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
          <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
          <Route path="/verify-otp" element={!authUser ? <OTPVerificationPage /> : <Navigate to="/" />} />
          <Route path="/forgot-password" element={!authUser ? <ForgotPasswordPage /> : <Navigate to="/" />} />
          <Route path="/reset-password" element={!authUser ? <ResetPasswordPage /> : <Navigate to="/" />} />
          <Route path="/settings" element={authUser ? <SettingsPage /> : <Navigate to="/login" />} />
          <Route path="/security" element={authUser ? <SecuritySettings /> : <Navigate to="/login" />} />
          <Route path="/profile" element={authUser ? <ProfilePage /> : <Navigate to="/login" />} />
          <Route path="/report-thanks" element={authUser ? <ReportThanksPage /> : <Navigate to="/login" />} />
          <Route path="/assistant" element={<Navigate to="/" replace />} />
          <Route path="/join-group/:groupId" element={
            <ErrorBoundary>
              <JoinGroupPage />
            </ErrorBoundary>
          } />
        </Routes>

        <Toaster />
      </div>
      </HelmetProvider>
    </GoogleOAuthProvider>
  );
};
export default App;