import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useThemeStore } from "../store/useThemeStore";
import { LogOut, Settings, Sun, Moon, Clock, Search } from "lucide-react";
import { useEffect, useState } from "react";
import GlobalSearchModal from "./GlobalSearchModal";
import { lynqitTheme } from "../theme/lynqit-theme";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();
  const { theme, autoThemeEnabled, toggleAutoTheme, setTheme, checkAutoTheme } = useThemeStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  // No need to force a theme on component mount
  // Let the theme system handle it based on user preferences
  useEffect(() => {
    // This space intentionally left blank
  }, []);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      // Check if we need to update the theme based on time
      if (autoThemeEnabled) {
        checkAutoTheme();
      }
    }, 60000);

    return () => clearInterval(timer);
  }, [autoThemeEnabled, checkAutoTheme]);

  // Keyboard shortcut for global search - Only for authenticated users
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Only allow global search for authenticated users
        if (authUser) {
          setShowGlobalSearch(true);
        }
      }
      if (e.key === 'Escape') {
        setShowGlobalSearch(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [authUser]);

  // Cycle through theme modes: auto → light → dark → auto
  const cycleThemeMode = () => {
    if (autoThemeEnabled) {
      // Currently in auto mode, switch to manual light
      toggleAutoTheme(); // Turn off auto
      setTheme("light"); // Force light theme
    } else if (theme === "light") {
      // Currently in light mode, switch to dark
      setTheme("dark");
    } else {
      // Currently in dark mode, switch back to auto
      toggleAutoTheme(); // Turn on auto
      checkAutoTheme(); // Set the correct theme based on time
    }
  };

  // Determine the icon to show based on current theme and auto mode
  const getThemeIcon = () => {
    if (autoThemeEnabled) {
      // Auto mode - show a different icon (clock) to indicate auto mode
      return <Clock className="w-4 h-4" />;
    } else {
      // Manual mode - show sun or moon based on current theme
      return theme === "light" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />;
    }
  };

  // Get tooltip text for the theme button
  const getThemeTooltip = () => {
    if (autoThemeEnabled) {
      const hour = currentTime.getHours();
      const timeBasedMode = (hour >= 6 && hour < 18) ? "light" : "dark";
      return `Auto theme (currently ${timeBasedMode} mode)`;
    } else {
      return theme === "light" ? "Light mode (click to toggle)" : "Dark mode (click to toggle)";
    }
  };

  return (
    <header className="app-nav fixed w-full top-0 z-40">
      <div className="mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="group flex items-center gap-2 transition-base">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-md ring-1 ring-black/5 group-hover:scale-105 transition-base">
              <img src="/logo.svg" alt="LynqIt Logo" className="h-7 w-7" />
            </div>
            <h1 className="text-[1.45rem] font-semibold tracking-tight flex items-center select-none">
              <span className="text-gradient-brand font-display">Lynq</span>
              <span className="ml-0.5 bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-orange-500 to-rose-500 font-display">It</span>
            </h1>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {authUser && (
            <button
              onClick={() => setShowGlobalSearch(true)}
              className="icon-btn group"
              title="Global Search (Ctrl+K)"
            >
              <Search className="w-5 h-5 text-gray-600 group-hover:text-gray-800 dark:text-gray-300 dark:group-hover:text-white transition-base" />
              <span className="sr-only">Open global search</span>
            </button>
          )}

          <button
            onClick={cycleThemeMode}
            className="icon-btn tooltip tooltip-bottom"
            data-tip={getThemeTooltip()}
          >
            <span className="text-gray-600 dark:text-gray-300">{getThemeIcon()}</span>
          </button>

            <Link
              to={"/settings"}
              className="btn-modern-ghost hidden sm:inline-flex items-center gap-2 h-10 px-4 font-medium"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Link>

          {authUser && (
            <button className="btn-modern-ghost inline-flex items-center gap-2 h-10 px-4" onClick={logout}>
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Search Modal - Only render for authenticated users */}
      {authUser && (
        <GlobalSearchModal
          isOpen={showGlobalSearch}
          onClose={() => setShowGlobalSearch(false)}
        />
      )}
    </header>
  );
};
export default Navbar;