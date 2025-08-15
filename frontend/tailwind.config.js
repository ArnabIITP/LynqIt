import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      animation: {
        // Subtle animations only
        fadeIn: 'fadeIn 0.3s ease-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 2s infinite linear',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.5' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      colors: {
        // Brand colors
        charcoal: '#333333', 
        tangerine: '#FFA500',
        
        // UI colors
        'app-bg': 'var(--color-app-bg, #F0F2F5)',
        'chat-bg': 'var(--color-chat-bg, #FFFFFF)',
        'sidebar-bg': 'var(--color-sidebar-bg, #FFFFFF)',
        'light-gray': 'var(--color-light-gray, #EDEDED)',
        'medium-gray': 'var(--color-medium-gray, #8696A0)',
        'dark-gray': 'var(--color-dark-gray, #54656F)',
        
        // Message colors
        'outgoing': 'var(--color-outgoing, #DCF8C6)',
        'incoming': 'var(--color-incoming, #FFFFFF)',
        
        // Status colors
        'online': 'var(--color-online, #25D366)',
        'offline': 'var(--color-offline, #8696A0)',
        'busy': 'var(--color-busy, #EA0038)',
        'unread': 'var(--color-unread, #25D366)',
        'success': 'var(--color-success, #25D366)',
        'error': 'var(--color-error, #EA0038)',
        'warning': 'var(--color-warning, #FFA500)',
        'info': 'var(--color-info, #34B7F1)',
        
        // Text colors
        'text': 'var(--color-text, #333333)',
        'text-secondary': 'var(--color-text-secondary, #54656F)',
        
        // Border colors
        'border': 'var(--color-border, #E9EDEF)',
        
        // Skeleton colors
        'skeleton': 'var(--color-skeleton, #EDEDED)',
        'skeleton-highlight': 'var(--color-skeleton-highlight, #F5F5F5)',
      },
      boxShadow: {
        'sidebar': 'var(--shadow-sidebar, 0 2px 5px rgba(11, 20, 26, 0.1))',
        'message': 'var(--shadow-message, 0 1px 0.5px rgba(11, 20, 26, 0.13))',
        'dropdown': 'var(--shadow-dropdown, 0 2px 10px rgba(11, 20, 26, 0.16))',
      },
      backgroundImage: {
        'skeleton-gradient': 'linear-gradient(90deg, var(--color-skeleton, #EDEDED) 0%, var(--color-skeleton-highlight, #F5F5F5) 50%, var(--color-skeleton, #EDEDED) 100%)',
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        light: {
          "primary": "#333333",
          "secondary": "#FFA500",
          "accent": "#FFA500",
          "neutral": "#8A8D91",
          "base-100": "#F5FFFA",
          "base-200": "#EDEDED",
          "base-300": "#E9EDEF",
          "base-content": "#232323",
          "chat-bubble-primary": "#FFF0F5",
          "chat-bubble-secondary": "#FFFFFF",
          "chat-bubble-primary-text": "#232323",
          "chat-bubble-secondary-text": "#333333",
        }
      },
      {
        dark: {
          "primary": "#FFA500",
          "secondary": "#00A884",
          "accent": "#FFA500",
          "neutral": "#B0BAC3",
          "base-100": "#181D23",
          "base-200": "#242C36",
          "base-300": "#313A44",
          "base-content": "#F5F7FA",
          "chat-bubble-primary": "#FFA500",
          "chat-bubble-secondary": "#232D39",
          "chat-bubble-primary-text": "#F5F7FA",
          "chat-bubble-secondary-text": "#F5F7FA",
        }
      }
    ],
  },
};