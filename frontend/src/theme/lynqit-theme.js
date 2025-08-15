/**
 * LynqIt Theme
 * 
 * This file contains the theme configuration for the LynqIt application.
 * Main brand colors:
 * - Charcoal Gray (#333333) for "Lynq"
 * - Tangerine Orange (#FFA500) for "It" 
 * - Professional clean UI inspired by enterprise chat applications
 */

// Brand colors that remain consistent across both themes
export const brandColors = {
  charcoal: '#333333', // Primary brand color
  tangerine: '#FFA500', // Secondary accent color
};

// Status colors that remain consistent across both themes
export const statusColors = {
  online: '#25D366',   // Online status (green)
  offline: '#8696A0',  // Offline status (gray)
  busy: '#EA0038',     // Busy status (red)
  success: '#25D366',  // Success state (green)
  error: '#EA0038',    // Error state (red)
  warning: '#FFA500',  // Warning state (orange)
  info: '#34B7F1',     // Info state (blue)
  unread: '#25D366',   // Unread notification badge
};

// Light theme (default)
export const lightTheme = {
  // Background colors - light mode
  appBg: '#F0F2F5',      // Main app background
  chatBg: '#FFFFFF',      // Chat area background
  sidebarBg: '#FFFFFF',   // Sidebar background
  
  // Additional palette - light mode
  lightGray: '#EDEDED',   // For subtle divisions and borders
  mediumGray: '#8696A0',  // For secondary text
  darkGray: '#54656F',    // For primary text
  
  // Message bubbles - light mode
  outgoingMessage: '#DCF8C6',  // Light green for sent messages
  incomingMessage: '#FFFFFF',  // White for received messages
  
  // UI elements - light mode
  buttonPrimary: '#333333',
  buttonSecondary: '#FFA500',
  activeItem: '#F0F2F5',
  hoverItem: '#F5F5F5',
  
  // Text colors - light mode
  text: '#333333',
  textSecondary: '#54656F',
  
  // Border colors - light mode
  border: '#E9EDEF',
  
  // Skeleton UI - light mode
  skeleton: '#EDEDED',
  skeletonHighlight: '#F5F5F5',
};

// Enhanced Dark theme
export const darkTheme = {
  // Background colors - improved dark mode
  appBg: '#121212',          // More neutral dark background with less blue tint
  chatBg: '#1E1E1E',         // Slightly lighter than app background for better contrast
  sidebarBg: '#0F0F0F',      // Darker than app for depth perception
  
  // Additional palette - enhanced dark mode
  lightGray: '#2D2D2D',      // More neutral gray for subtle divisions and borders
  mediumGray: '#8F8F8F',     // Improved contrast for secondary text
  darkGray: '#CDCDCD',       // Better contrast for primary text
  
  // Message bubbles - enhanced dark mode
  outgoingMessage: '#1F3A33', // More balanced dark green for sent messages
  incomingMessage: '#2D2D30', // More neutral dark for received messages
  
  // UI elements - enhanced dark mode
  buttonPrimary: '#2C7A7B',  // Teal tone that's easier on the eyes
  buttonSecondary: '#D97706', // Amber orange - better for dark mode
  activeItem: '#3A3A3C',     // More modern active item background
  hoverItem: '#2C2C2E',      // More subtle hover effect
  
  // Text colors - enhanced dark mode
  text: '#F5F5F5',           // Very light gray for primary text (not pure white)
  textSecondary: '#9E9E9E',  // Medium gray for secondary text
  
  // Border colors - enhanced dark mode
  border: '#333333',        // Slightly stronger border for better visibility
  
  // Accent colors - new for enhanced dark mode
  accent: '#4F46E5',        // Indigo accent for highlights
  accentSubtle: '#312E81',  // Subtle indigo for backgrounds
  
  // Skeleton UI - enhanced dark mode
  skeleton: '#2C2C2C',
  skeletonHighlight: '#3A3A3A',
  
  // Glass effect colors - new for enhanced dark mode
  glassBackground: 'rgba(30, 30, 30, 0.7)',
  glassBorder: 'rgba(75, 75, 75, 0.3)',
  glassBackdrop: 'blur(12px)',
};

// Shared UI properties
export const uiProperties = {
  fontFamily: {
    sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
    heading: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
  },
  
  borderRadius: {
    small: '4px',
    medium: '8px',
    large: '12px',
    xl: '16px',
    full: '9999px',
  },
  
  shadows: {
    small: '0 1px 3px rgba(0, 0, 0, 0.08)',
    medium: '0 1px 5px rgba(0, 0, 0, 0.12)',
    large: '0 2px 10px rgba(11, 20, 26, 0.16)',
    sidebar: '0 2px 5px rgba(11, 20, 26, 0.1)',
    messageDark: '0 1px 0.5px rgba(0, 0, 0, 0.3)',
    messageLight: '0 1px 0.5px rgba(11, 20, 26, 0.13)',
    // Enhanced shadows for dark mode
    darkSmall: '0 2px 5px rgba(0, 0, 0, 0.2)',
    darkMedium: '0 4px 10px rgba(0, 0, 0, 0.3)',
    darkLarge: '0 8px 16px rgba(0, 0, 0, 0.4)',
    darkGlow: '0 0 15px rgba(79, 70, 229, 0.15)', // Subtle indigo glow
    darkInset: 'inset 0 1px 2px rgba(0, 0, 0, 0.2)',
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    xxl: '32px'
  }
};

// Complete theme objects with all properties
export const lynqitTheme = {
  name: 'lynqit',
  light: {
    ...brandColors,
    ...lightTheme,
    ...statusColors,
  },
  dark: {
    ...brandColors,
    ...darkTheme,
    ...statusColors,
  },
  ...uiProperties
};

export default lynqitTheme;
