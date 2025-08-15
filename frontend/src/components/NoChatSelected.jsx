import { MessageSquare } from "lucide-react";


const tips = [
  "Pin important chats for quick access.",
  "Switch between light and dark mode from the sidebar.",
  "Use Ctrl+K for global search across chats, groups, and users.",
  "Try the AI Assistant for smart replies and suggestions.",
];

const updates = [
  "New: Notification Center for system updates.",
  "Improved: Real-time unread message badges.",
  "Enhanced: Online/offline status indicators.",
];

const NoChatSelected = () => {
  return (
    <div className="w-full flex flex-1 flex-col items-center justify-center min-h-[60vh] px-2 py-8 bg-base-100">
      <div className="w-full max-w-2xl flex flex-col items-center">
        {/* Icon Display */}
        <div className="flex justify-center mb-8 w-full">
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-base-200 flex items-center justify-center mx-auto">
              <img src="/logo.svg" alt="LynqIt Logo" className="h-16" />
            </div>
          </div>
        </div>

        {/* Welcome Text */}
        <h2 className="text-2xl md:text-3xl font-bold text-base-content mb-2 text-center">Welcome to LynqIt</h2>
        <p className="text-neutral mb-6 text-center max-w-xl">
          Select a conversation to start chatting, or explore the features below to get started!
        </p>

        {/* Responsive grid for sections */}
        <div className="w-full flex flex-col md:flex-row md:space-x-6 space-y-4 md:space-y-0 justify-center items-stretch">
          {/* Get Started Guide */}
          <div className="flex-1 bg-base-200/60 rounded-lg p-4 mb-0 min-w-[220px] max-w-full">
            <h3 className="font-semibold text-base-content mb-2 text-center md:text-left">Get Started</h3>
            <ul className="text-left text-sm text-base-content/80 list-disc list-inside space-y-1">
              <li>Click on a chat or group from the sidebar to open a conversation.</li>
              <li>Use the <b>AI Assistant</b> tab for smart chat features.</li>
              <li>Check your notifications by clicking the bell icon in the sidebar.</li>
            </ul>
          </div>

          {/* Tips Section */}
          <div className="flex-1 bg-base-200/40 rounded-lg p-4 mb-0 min-w-[220px] max-w-full">
            <h3 className="font-semibold text-base-content mb-2 text-center md:text-left">Tips</h3>
            <ul className="text-left text-sm text-base-content/70 list-disc list-inside space-y-1">
              {tips.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>

          {/* Recent Updates Section */}
          <div className="flex-1 bg-base-200/30 rounded-lg p-4 min-w-[220px] max-w-full">
            <h3 className="font-semibold text-base-content mb-2 text-center md:text-left">Recent Updates</h3>
            <ul className="text-left text-sm text-base-content/60 list-disc list-inside space-y-1">
              {updates.map((update, idx) => (
                <li key={idx}>{update}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoChatSelected;