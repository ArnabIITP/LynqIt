/**
 * Formats a date into a relative time string (e.g., "just now", "5m ago", "2h ago", "3d ago")
 * 
 * @param {Date|string|number} date - The date to format
 * @returns {string} A string representing the relative time
 */
export const formatTimeAgo = (date) => {
  if (!date) return "";
  
  const now = new Date();
  const dateToFormat = typeof date === "string" || typeof date === "number"
    ? new Date(date) 
    : date;
  
  // Time difference in seconds
  const diffSeconds = Math.floor((now - dateToFormat) / 1000);
  
  // Less than a minute
  if (diffSeconds < 60) {
    return "Just now";
  }
  
  // Less than an hour
  if (diffSeconds < 3600) {
    const minutes = Math.floor(diffSeconds / 60);
    return `${minutes}m ago`;
  }
  
  // Less than a day
  if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours}h ago`;
  }
  
  // Less than a week
  if (diffSeconds < 604800) {
    const days = Math.floor(diffSeconds / 86400);
    return `${days}d ago`;
  }
  
  // Less than a month
  if (diffSeconds < 2592000) {
    const weeks = Math.floor(diffSeconds / 604800);
    return `${weeks}w ago`;
  }
  
  // Less than a year
  if (diffSeconds < 31536000) {
    const months = Math.floor(diffSeconds / 2592000);
    return `${months}mo ago`;
  }
  
  // More than a year
  const years = Math.floor(diffSeconds / 31536000);
  return `${years}y ago`;
};
