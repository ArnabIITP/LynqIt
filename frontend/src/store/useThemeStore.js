import { create } from "zustand";
import { lynqitTheme } from "../theme/lynqit-theme";

const getTimeBasedTheme = () => {
  const currentHour = new Date().getHours();
  return (currentHour >= 6 && currentHour < 18) ? "light" : "dark"; // Day: 6am-6pm, Night: 6pm-6am
};

// Get the current theme variables based on theme name
export const getThemeVariables = (themeName = "light") => {
  if (themeName === "dark") {
    return lynqitTheme.dark;
  } else {
    return lynqitTheme.light;
  }
};

// Set default theme based on time if auto theme hasn't been configured yet
const initializeAutoTheme = () => {
  // If autoTheme setting doesn't exist in local storage yet
  if (localStorage.getItem("chat-auto-theme") === null) {
    // Enable auto theme by default
    localStorage.setItem("chat-auto-theme", "true");
    
    // Set initial theme based on time
    const timeBasedTheme = getTimeBasedTheme();
    localStorage.setItem("chat-theme", timeBasedTheme);
    
    return true; // Auto theme is enabled
  }
  
  // Otherwise use the existing setting
  return JSON.parse(localStorage.getItem("chat-auto-theme") || "false");
};

// Initialize auto theme setting before creating the store
const defaultAutoThemeEnabled = initializeAutoTheme();

// Set the initial theme attribute on document
const initialTheme = localStorage.getItem("chat-theme") || getTimeBasedTheme();
document.documentElement.setAttribute('data-theme', initialTheme);

export const useThemeStore = create((set, get) => ({
  theme: initialTheme,
  autoThemeEnabled: defaultAutoThemeEnabled,
  themeVariables: getThemeVariables(initialTheme),
  
  setTheme: (theme) => {
    localStorage.setItem("chat-theme", theme);
    
    // Update data-theme attribute on document for CSS selectors
    document.documentElement.setAttribute('data-theme', theme);
    
    set({ 
      theme,
      themeVariables: getThemeVariables(theme)
    });
  },
  
  toggleAutoTheme: () => {
    const currentValue = get().autoThemeEnabled;
    const newValue = !currentValue;
    localStorage.setItem("chat-auto-theme", JSON.stringify(newValue));
    
    // If enabling auto theme, immediately set the time-based theme
    if (newValue) {
      const timeBasedTheme = getTimeBasedTheme();
      localStorage.setItem("chat-theme", timeBasedTheme);
      set({ 
        autoThemeEnabled: newValue, 
        theme: timeBasedTheme,
        themeVariables: getThemeVariables(timeBasedTheme)
      });
    } else {
      set({ autoThemeEnabled: newValue });
    }
  },
  
  checkAutoTheme: () => {
    const { autoThemeEnabled } = get();
    if (autoThemeEnabled) {
      const timeBasedTheme = getTimeBasedTheme();
      localStorage.setItem("chat-theme", timeBasedTheme);
      
      // Update data-theme attribute on document for CSS selectors
      document.documentElement.setAttribute('data-theme', timeBasedTheme);
      
      set({ 
        theme: timeBasedTheme,
        themeVariables: getThemeVariables(timeBasedTheme)
      });
    }
  }
}));