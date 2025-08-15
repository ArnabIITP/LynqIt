import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useStatusStore } from "../store/useStatusStore";
import { useAuthStore } from "../store/useAuthStore";
import { useAIStore } from "../store/useAIStore";
import { useThemeStore } from "../store/useThemeStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import GroupCreateModal from "./GroupCreateModal";
import StatusCreateModal from "./StatusCreateModal";
import StatusViewer from "./StatusViewer";
import StatusPrivacyModal from "./StatusPrivacyModal";
import PinButton from "./PinButton";
import GlobalSearchModal from "./GlobalSearchModal";
import { Search, Plus, MessageCircle, Circle, Camera, Trash2, X, Settings, Sun, Moon, Clock, LogOut, MoreVertical, Bell, Star } from "lucide-react";
import GroupAvatar from "./GroupAvatar";

const Sidebar = ({ isOpen, setIsOpen, activeTab: propActiveTab }) => {
  const {
    getUsers,
    getAllUsers,
    users,
    allUsers,
    selectedUser,
    setSelectedUser,
    isUsersLoading,
    unreadCounts
  } = useChatStore();

  // Track if this is the first load
  const [initialLoad, setInitialLoad] = useState(true);
  // Notification center state
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, text: "Welcome to LynqIt! 🎉" },
    { id: 2, text: "Try our new dark mode and chat pinning features!" },
    // Add more static or dynamic notifications here
  ]);
  // Chat filter state
  const [chatFilter, setChatFilter] = useState("all"); // all | unread | favorites
  
  const navigate = useNavigate();

  const {
    groups,
    selectedGroup,
    setSelectedGroup,
    getGroups,
    isGroupsLoading,
    subscribeToGroupEvents,
    unsubscribeFromGroupEvents,
    navigateToFirstMention
  } = useGroupStore();

  const { onlineUsers, authUser, socket, logout } = useAuthStore();
  const { theme, autoThemeEnabled, toggleAutoTheme, setTheme, checkAutoTheme } = useThemeStore();

  const {
    myStatuses,
    contactStatuses,
    getMyStatuses,
    getContactStatuses,
    getUnviewedStatusCount,
    handleNewStatus,
    handleStatusReaction,
    handleStatusMessage
  } = useStatusStore();

  // Removed per-tab search inputs; rely on global search modal (Ctrl+K)
  const [activeTab, setActiveTab] = useState(propActiveTab || "chats"); // "chats", "status", "groups", or "assistant"
  const [showGroupCreateModal, setShowGroupCreateModal] = useState(false);
  const [showStatusCreateModal, setShowStatusCreateModal] = useState(false);
  const [showStatusViewer, setShowStatusViewer] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [statusViewerData, setStatusViewerData] = useState({ contactIndex: 0, statusIndex: 0 });
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [defaultPrivacy, setDefaultPrivacy] = useState({ visibility: "contacts", specificUsers: [] });
  
  // Update active tab when prop changes
  useEffect(() => {
    if (propActiveTab) {
      setActiveTab(propActiveTab);
    }
  }, [propActiveTab]);

  useEffect(() => {
    // Only show skeleton on very first load
    setInitialLoad(true);
    Promise.all([
      getUsers(),
      getGroups(),
      getMyStatuses(),
      getContactStatuses()
    ]).finally(() => setInitialLoad(false));
  }, [getUsers, getGroups, getMyStatuses, getContactStatuses]);

  // Socket.IO listeners for real-time status updates
  useEffect(() => {
    if (!socket) return;

    // Listen for new status updates
    socket.on("newStatus", handleNewStatus);

    // Listen for status reactions
    socket.on("statusReaction", handleStatusReaction);

    // Listen for status messages
    socket.on("statusMessage", handleStatusMessage);

    return () => {
      socket.off("newStatus");
      socket.off("statusReaction");
      socket.off("statusMessage");
    };
  }, [socket, handleNewStatus, handleStatusReaction, handleStatusMessage]);

  useEffect(() => {
    // Subscribe to group events when component mounts
    subscribeToGroupEvents();

    return () => {
      unsubscribeFromGroupEvents();
    };
  }, [subscribeToGroupEvents, unsubscribeFromGroupEvents]);
  
  // Update current time every minute for auto theme
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

  // Keyboard shortcut for global search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
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

  // Removed local search effect – global search handles cross-entity querying

  // Listen for refreshChat events from the server
  useEffect(() => {
    if (!socket) return;

    const handleRefreshChats = () => {
      getUsers();
    };

    socket.on("refreshChats", handleRefreshChats);

    return () => {
      socket.off("refreshChats", handleRefreshChats);
    };
  }, [socket, getUsers]);

  // Display existing chats when not searching, or search results when searching
  let displayUsers = users.filter((u) => u._id !== authUser._id);
  if (chatFilter === "unread") {
    displayUsers = displayUsers.filter(u => (unreadCounts.personal?.[u._id] || 0) > 0);
  } else if (chatFilter === "favorites") {
    displayUsers = displayUsers.filter(u => u.isPinned);
  }
  const displayGroups = groups;

  // Import AI store functions
  const { 
    selectAI, 
    deselectAI, 
    conversationHistory,
    selectedHistoryId,
    selectConversation,
    startNewConversation,
    deleteConversation,
    searchConversations
  } = useAIStore();

  // Handle tab switching
  const handleTabSwitch = (tab) => {
    if (tab === "assistant") {
      // Select AI Assistant in the main chat view instead of navigating
      setActiveTab(tab);
      setSelectedUser(null);
      setSelectedGroup(null);
      selectAI(); // Select the AI in the store
  // clear focus; search moved to global modal
      return;
    }
    
    // For other tabs, deselect AI
    deselectAI();
    setActiveTab(tab);
    setSelectedUser(null);
    setSelectedGroup(null);
  // no local query reset needed
  };

  // Handle group selection
  const handleGroupSelect = async (group) => {
    deselectAI(); // Deselect AI when selecting a group
    await setSelectedGroup(group);
    setSelectedUser(null);
  };
  
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
  
  const handleLogout = async () => {
    try {
      await logout();
      // Add a small delay to ensure the logout request completes
      setTimeout(() => {
        window.location.href = "/login";
      }, 100);
    } catch (error) {
      console.error("Logout failed:", error);
      // Redirect anyway if there's an error
      window.location.href = "/login";
    }
  };

  // Handle user selection
  const handleUserSelect = (user) => {
    deselectAI(); // Deselect AI when selecting a user
    setSelectedUser(user);
    setSelectedGroup(null);
  };

  // Handle mention badge click
  const handleMentionBadgeClick = async (e, group) => {
    e.stopPropagation(); // Prevent group selection

    // First select the group
    await setSelectedGroup(group);
    setSelectedUser(null);

    // Then navigate to first mention
    const messageId = await navigateToFirstMention(group._id);
    if (messageId) {
      // Scroll to the message (implement in ChatContainer)
      console.log("Navigate to message:", messageId);
      // You can emit a custom event or use a callback here
    }
  };

  // Handle status click to open viewer
  // Show first unseen status, or oldest if all seen
  const handleStatusClick = (contactIndex) => {
    const contact = contactStatuses[contactIndex];
    let statusIndex = 0;
    if (contact && contact.statuses && contact.statuses.length > 0) {
      statusIndex = contact.statuses.findIndex(s => !s.hasViewed);
      if (statusIndex === -1) statusIndex = 0; // all seen, show oldest
    }
    setStatusViewerData({ contactIndex, statusIndex });
    setShowStatusViewer(true);
  };

  // Handle my status click - only view if statuses exist
  const handleMyStatusClick = () => {
    if (myStatuses.length > 0) {
      // Show first unseen, else oldest
      let statusIndex = myStatuses.findIndex(s => !s.hasViewed);
      if (statusIndex === -1) statusIndex = 0;
      setStatusViewerData({ contactIndex: -1, statusIndex });
      setShowStatusViewer(true);
    }
    // Do nothing if no statuses - user must use camera button to create
  };

  // Get combined statuses for viewer (my statuses + contact statuses)
  const getCombinedStatusesForViewer = () => {
    const myStatusContact = myStatuses.length > 0 ? {
      user: authUser,
      statuses: myStatuses,
      hasUnviewed: false
    } : null;

    return myStatusContact ? [myStatusContact, ...contactStatuses] : contactStatuses;
  };

  // Handle pin toggle for chats
  const handleChatPinToggle = (chatId, isPinned) => {
    // Immediately update the local state for better UX
    const updatedUsers = users.map(user =>
      user._id === chatId ? { ...user, isPinned } : user
    );

    // Sort users to show pinned ones first
    const sortedUsers = [...updatedUsers].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });

    // Update the store with the new sorted list
    useChatStore.setState({ users: sortedUsers });

    // Also refresh to ensure server sync (but UI already updated)
    setTimeout(() => getUsers(), 100);
  };

  // Handle pin toggle for groups
  const handleGroupPinToggle = (groupId, isPinned) => {
    // Immediately update the local state for better UX
    const updatedGroups = groups.map(group =>
      group._id === groupId ? { ...group, isPinned } : group
    );

    // Sort groups to show pinned ones first
    const sortedGroups = [...updatedGroups].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });

    // Update the store with the new sorted list
    useGroupStore.setState({ groups: sortedGroups });

    // Also refresh to ensure server sync (but UI already updated)
    setTimeout(() => getGroups(), 100);
  };

  // Only show skeleton on very first load
  if (initialLoad) return <SidebarSkeleton />;

  return (
    <>
  <aside className="h-full w-30 lg:w-80 min-w-24 lg:min-w-80 max-w-24 lg:max-w-80 border-r border-base-200 flex flex-shrink-0 bg-base-100 z-20 relative overflow-hidden shadow-sm">
        {/* Sidebar navigation */}
  <div className="w-30 bg-base-200/50 border-r border-base-200 flex flex-col items-center py-3 gap-3">
          {/* Profile Picture */}
          <Link to="/profile" className="relative">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md">
              <img
                src={authUser?.profilePic || "/avatar.png"}
                alt="Profile"
                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                title={`${authUser?.fullName} - Click to view profile`}
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-success rounded-full border-2 border-white"></div>
          </Link>

          {/* Tab Icons */}
          <div className="flex flex-col gap-3">
            {/* Chats Tab */}
            <button
              onClick={() => handleTabSwitch("chats")}
              className={`relative p-3 rounded-xl transition-all duration-200 ${
                activeTab === "chats"
                  ? "bg-tangerine/10 text-tangerine"
                  : "bg-transparent text-charcoal/70 hover:bg-charcoal/5"
              }`}
              title="Chats"
            >
              <MessageCircle size={22} strokeWidth={activeTab === "chats" ? 2.5 : 2} />
              {(unreadCounts.totalPersonal > 0) && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-tangerine text-white rounded-full flex items-center justify-center text-xs font-semibold shadow-sm">
                  {unreadCounts.totalPersonal > 9 ? '9+' : unreadCounts.totalPersonal}
                </div>
              )}
            </button>

            {/* Status Tab */}
            <button
              onClick={() => handleTabSwitch("status")}
              className={`relative p-3 rounded-xl transition-all duration-200 ${
                activeTab === "status"
                  ? "bg-tangerine/10 text-tangerine"
                  : "bg-transparent text-charcoal/70 hover:bg-charcoal/5"
              }`}
              title="Status"
            >
              <Circle size={22} strokeWidth={activeTab === "status" ? 2.5 : 2} />
              {/* Status indicator for new status updates */}
              {getUnviewedStatusCount() > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-success text-white rounded-full flex items-center justify-center text-xs font-semibold shadow-sm">
                  {getUnviewedStatusCount() > 9 ? '9+' : getUnviewedStatusCount()}
                </div>
              )}
            </button>

            {/* Groups Tab */}
            <button
              onClick={() => handleTabSwitch("groups")}
              className={`relative p-3 rounded-xl transition-all duration-200 ${
                activeTab === "groups"
                  ? "bg-tangerine/10 text-tangerine"
                  : "bg-transparent text-charcoal/70 hover:bg-charcoal/5"
              }`}
              title="Groups"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={activeTab === "groups" ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              {(unreadCounts.totalGroups > 0 || unreadCounts.totalMentions > 0) && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-tangerine text-white rounded-full flex items-center justify-center text-xs font-semibold shadow-sm">
                  {(unreadCounts.totalGroups + unreadCounts.totalMentions) > 9 ? '9+' : (unreadCounts.totalGroups + unreadCounts.totalMentions)}
                </div>
              )}
            </button>
            
            {/* LynqIt AI Tab */}
            <button
              onClick={() => handleTabSwitch("assistant")}
              className={`relative p-3 rounded-xl transition-all duration-200 ${
                activeTab === "assistant"
                  ? "bg-tangerine/10 text-tangerine"
                  : "bg-transparent text-charcoal/70 hover:bg-charcoal/5"
              }`}
              title="LynqIt AI"
            >
              <img 
                src="/images/ai-logo.svg" 
                alt="LynqIt AI" 
                className={`w-[22px] h-[22px] ${activeTab === "assistant" ? "opacity-100" : "opacity-70"}`}
                style={{ pointerEvents: "none" }}
              />
            </button>
          </div>

          {/* Utility Buttons */}
          <div className="flex flex-col gap-3 mt-auto pb-2 relative">
            {/* Notification Center */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(v => !v)}
                className={`p-3 rounded-xl transition-all duration-200 bg-transparent text-charcoal/70 hover:bg-charcoal/5 ${showNotifications ? 'bg-tangerine/10 text-tangerine' : ''}`}
                title="Notifications"
              >
                <Bell size={22} strokeWidth={2} />
                {notifications.length > 0 && (
                  <span className="absolute top-2 right-2 w-3 h-3 bg-error rounded-full border-2 border-white"></span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute left-12 bottom-0 w-64 bg-base-100 border border-base-200 rounded-lg shadow-lg z-50 p-3">
                  <div className="font-semibold mb-2 text-base-content">Notifications</div>
                  {notifications.length === 0 ? (
                    <div className="text-sm text-zinc-500">No notifications</div>
                  ) : (
                    <ul className="space-y-2 max-h-48 overflow-y-auto">
                      {notifications.map(n => (
                        <li key={n.id} className="text-sm text-base-content/90 flex items-center gap-2">
                          <span>•</span> {n.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            {/* Global Search button */}
            <button
              onClick={() => setShowGlobalSearch(true)}
              className="p-3 rounded-xl transition-all duration-200 bg-transparent text-charcoal/70 hover:bg-charcoal/5"
              title="Global Search (Ctrl+K)"
            >
              <Search size={22} strokeWidth={2} />
            </button>
            {/* Theme toggle button */}
            <button
              onClick={cycleThemeMode}
              className="p-3 rounded-xl transition-all duration-200 bg-transparent text-charcoal/70 hover:bg-charcoal/5"
              title={getThemeTooltip()}
            >
              {getThemeIcon()}
            </button>
            {/* Settings button */}
            <Link
              to="/settings"
              className="p-3 rounded-xl transition-all duration-200 bg-transparent text-charcoal/70 hover:bg-charcoal/5"
              title="Settings"
            >
              <Settings size={22} strokeWidth={2} />
            </Link>
            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="p-3 rounded-xl transition-all duration-200 bg-transparent text-charcoal/70 hover:bg-charcoal/5"
              title="Logout"
            >
              <LogOut size={22} strokeWidth={2} />
            </button>
          </div>
          
          {/* Removed Add Group and Add Status buttons from sidebar vertical bar */}
        </div>

        {/* Content Area */}
        <div className="hidden lg:flex flex-1 flex-col">
          <div className="border-b border-base-200 px-5 pt-5 pb-3 bg-base-100">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[1.15rem] font-semibold tracking-tight text-base-content">
                {activeTab === "chats" && "Chats"}
                {activeTab === "status" && "Status"}
                {activeTab === "groups" && "Groups"}
                {activeTab === "assistant" && "LynqIt AI"}
              </h2>
              {activeTab === "groups" && (
                <button
                  onClick={() => setShowGroupCreateModal(true)}
                  className="icon-btn h-9 w-9"
                  title="Create Group"
                >
                  <Plus size={16} />
                </button>
              )}
              {activeTab === "status" && (
                <button
                  onClick={() => setShowStatusCreateModal(true)}
                  className="icon-btn h-9 w-9"
                  title="Add Status"
                >
                  {/* Camera icon SVG, matches your attachment */}
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.5"/><path d="M5 7l1.5-3h11L19 7"/></svg>
                </button>
              )}
            </div>
            {/* Chat List Filter (only for chats tab) */}
            {activeTab === "chats" && (
              <div className="flex gap-2 mb-2">
                <button
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${chatFilter === 'all' ? 'bg-tangerine/10 text-tangerine' : 'hover:bg-base-200 text-base-content/70'}`}
                  onClick={() => setChatFilter('all')}
                >All</button>
                <button
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${chatFilter === 'unread' ? 'bg-tangerine/10 text-tangerine' : 'hover:bg-base-200 text-base-content/70'}`}
                  onClick={() => setChatFilter('unread')}
                >Unread</button>
                <button
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${chatFilter === 'favorites' ? 'bg-tangerine/10 text-tangerine' : 'hover:bg-base-200 text-base-content/70'}`}
                  onClick={() => setChatFilter('favorites')}
                ><Star size={14} className="inline mr-1 -mt-0.5" />Favorites</button>
              </div>
            )}
            <div className="text-[11px] font-medium uppercase tracking-wide text-base-content/50 flex items-center gap-1">
              <span>Press</span>
              <kbd className="px-1.5 py-0.5 rounded bg-base-300 text-[10px] font-semibold">Ctrl</kbd>
              +
              <kbd className="px-1.5 py-0.5 rounded bg-base-300 text-[10px] font-semibold">K</kbd>
              <span className="hidden xl:inline">for Global Search</span>
            </div>
          </div>

          {/* Content List */}
          <div className="overflow-y-auto flex-1 py-4 space-y-1 thin-scrollbar">
            {activeTab === "chats" ? (
              // Display users/chats
            <>
              {displayUsers.map((user) => {
                const unreadCount = unreadCounts.personal?.[user._id] || 0;

                return (
                  <button
                    key={user._id}
                    onClick={() => handleUserSelect(user)}
                    className={`group w-full p-2 flex items-center gap-2 transition-all duration-200 rounded-xl mx-2 ${selectedUser?._id === user._id ? "bg-tangerine/10 shadow-sm" : "hover:bg-charcoal/5"}`}
                  >
                    <div className="relative mx-auto lg:mx-0">
                      <img
                        src={user.profilePic || "/avatar.png"}
                        alt={user.username}
                        className="size-12 object-cover rounded-full border border-base-200"
                      />
                      {onlineUsers.includes(user._id) && (
                        <span className="absolute bottom-0 right-0 size-3 bg-success rounded-full ring-2 ring-white" />
                      )}
                    </div>

                    <div className="hidden lg:block text-left min-w-0 flex-1 max-w-[160px]">
                      <div className="font-medium truncate flex items-center gap-2 text-charcoal">
                        <span className="truncate">{user.fullName}</span>
                        {user.isPinned && (
                          <span className="text-tangerine flex-shrink-0" title="Pinned">📌</span>
                        )}
                      </div>
                      <div className="text-sm text-charcoal/60 truncate">@{user.username}</div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Pin Button */}
                      <PinButton
                        itemId={user._id}
                        itemType="chat"
                        isPinned={user.isPinned || false}
                        onPinToggle={handleChatPinToggle}
                        className="opacity-60 group-hover:opacity-100 transition-opacity text-charcoal/70"
                        asDiv={true}
                        iconOnly={true}
                      />

                      {/* Unread message count badge */}
                      {unreadCount > 0 && (
                        <div className="flex items-center justify-center min-w-5 h-5 rounded-full bg-tangerine text-white text-xs font-medium shadow-sm">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}

              {displayUsers.length === 0 && (
                <div className="text-center text-zinc-500 py-6 text-sm">No conversations yet</div>
              )}
            </>
            ) : activeTab === "status" ? (
              // Display status updates
              <>
                {/* My Status */}
                <div className="px-4 mb-4">
                  <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${myStatuses.length > 0 ? 'hover:bg-base-300 cursor-pointer' : 'cursor-default'}`}
                    onClick={handleMyStatusClick}
                  >
                    <div className="relative">
                      <img
                        src={authUser?.profilePic || "/avatar.png"}
                        alt="My Status"
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">My status</div>
                      <div className="text-sm text-base-content/60">
                        {myStatuses.length > 0 ? `${myStatuses.length} update${myStatuses.length > 1 ? 's' : ''}` : 'No status updates'}
                      </div>
                    </div>
                    {/* 3-dot menu for privacy settings */}
                    <button
                      className="ml-2 p-2 rounded-full hover:bg-base-300 transition-colors"
                      title="Status privacy settings"
                      onClick={e => { e.stopPropagation(); setShowPrivacyModal(true); }}
                    >
                      <MoreVertical size={20} />
                    </button>
      {/* Status Privacy Modal */}
      <StatusPrivacyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        defaultPrivacy={defaultPrivacy}
        onSave={settings => setDefaultPrivacy(settings)}
      />
                  </div>
                </div>

                {/* Status Updates */}
                <div className="px-4">
                  {contactStatuses.length > 0 && (
                    <div className="text-sm font-medium text-base-content/60 mb-3 px-3">Recent updates</div>
                  )}

                  {/* Contact Status Updates */}
                  {contactStatuses.map((contact, contactIndex) => {
                    return (
                      <div
                        key={contact.user._id}
                        className="flex items-center gap-3 p-3 hover:bg-base-300 rounded-lg cursor-pointer transition-colors"
                        onClick={() => handleStatusClick(contactIndex)}
                      >
                        <div className="relative">
                          <img
                            src={contact.user.profilePic || "/avatar.png"}
                            alt={contact.user.fullName}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          {contact.hasUnviewed && (
                            <div className="absolute inset-0 rounded-full border-2 border-primary"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{contact.user.fullName}</div>
                          <div className="text-sm text-base-content/60">
                            {contact.statuses.length} update{contact.statuses.length > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* No status message */}
                  {contactStatuses.length === 0 && (
                    <div className="text-center text-zinc-500 py-8">
                      <Circle size={48} className="mx-auto mb-3 opacity-50" />
                      <p className="mb-2">No status updates</p>
                      <p className="text-sm">Status updates from your contacts will appear here</p>
                    </div>
                  )}
                </div>
              </>
            ) : activeTab === "groups" ? (
              // Display groups
            <>
              {displayGroups.map((group) => {
                const memberCount = group.memberCount || group.members?.length || 0;
                const groupUnreadCount = unreadCounts.groups?.[group._id] || 0;
                const mentionCount = unreadCounts.mentions?.[group._id] || 0;

                return (
                  <button
                    key={group._id}
                    onClick={() => handleGroupSelect(group)}
                    className={`group w-full p-3 flex items-center gap-3 hover:bg-base-300/60 transition-all duration-200 rounded-lg mx-2 ${selectedGroup?._id === group._id ? "bg-primary/10 border border-primary/20 shadow-sm" : "hover:shadow-sm"}`}
                  >
                    <div className="relative mx-auto lg:mx-0">
                      <GroupAvatar name={group.name} avatarUrl={group.avatar} size={12} />
                    </div>

                    <div className="hidden lg:block text-left min-w-0 flex-1 max-w-[160px]">
                      <div className="font-medium truncate flex items-center gap-2">
                        <span className="truncate">{group.name}</span>
                        {group.isPinned && (
                          <span className="text-primary flex-shrink-0" title="Pinned">📌</span>
                        )}
                      </div>
                      <div className="text-sm text-zinc-400 truncate">
                        {memberCount} member{memberCount !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* Pin Button and Unread/mention badges */}
                    <div className="flex items-center gap-1">
                      {/* Pin Button */}
                      <PinButton
                        itemId={group._id}
                        itemType="group"
                        isPinned={group.isPinned || false}
                        onPinToggle={handleGroupPinToggle}
                        className="opacity-60 group-hover:opacity-100 transition-opacity"
                        asDiv={true}
                        iconOnly={true}
                      />

                      {/* Unread and mention badges */}
                      <div className="flex flex-col gap-1">
                      {/* Mention count (priority) - clickable */}
                      {mentionCount > 0 && (
                        <button
                          onClick={(e) => handleMentionBadgeClick(e, group)}
                          className="flex items-center justify-center min-w-5 h-5 rounded-full bg-error text-error-content text-xs font-medium hover:bg-error/80 transition-colors"
                          title="Click to go to first mention"
                        >
                          @{mentionCount > 99 ? '99+' : mentionCount}
                        </button>
                      )}

                      {/* Regular unread count */}
                      {groupUnreadCount > 0 && mentionCount === 0 && (
                        <div className="flex items-center justify-center min-w-5 h-5 rounded-full bg-primary text-primary-content text-xs font-medium">
                          {groupUnreadCount > 99 ? '99+' : groupUnreadCount}
                        </div>
                      )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {displayGroups.length === 0 && (
                <div className="text-center text-zinc-500 py-4">
                  <div className="space-y-2">
                    <p>No groups yet</p>
                    <button
                      onClick={() => setShowGroupCreateModal(true)}
                      className="btn btn-primary btn-sm"
                    >
                      Create your first group
                    </button>
                  </div>
                </div>
              )}
            </>
            ) : (
              // Display AI Assistant tab (assistant tab case)
              <>
                <div className="px-4 pt-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-charcoal">AI Conversations</h3>
                  </div>
                  <button
                    onClick={startNewConversation}
                    className="w-full max-w-[220px] bg-tangerine hover:bg-tangerine/90 text-white py-2 px-4 rounded-lg flex items-center justify-center text-sm font-medium shadow-md transition-all"
                  >
                    New Chat
                  </button>
                </div>
                
                {/* AI conversation history */}
                <div className="flex-1 overflow-y-auto px-2 pb-2">
                  {searchConversations("").length > 0 ? (
                    searchConversations("").map((conversation) => (
                      <button
                        key={conversation.id}
                        onClick={() => {
                          // Only select the conversation, don't trigger a new message generation
                          selectConversation(conversation.id);
                        }}
                        className={`w-full py-2 px-3 flex items-center gap-2 hover:bg-light-gray transition-all duration-200 rounded-lg mb-1.5 mx-2 text-left
                          ${selectedHistoryId === conversation.id ? "bg-tangerine/10 shadow-sm" : ""}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-charcoal/10 flex items-center justify-center flex-shrink-0">
                          <img src="/images/ai-logo.svg" alt="LynqIt AI" className="w-5 h-5" />
                        </div>
                        
                        <div className="text-left min-w-0 flex-1 max-w-[100px]">
                          <div className="font-medium truncate text-sm text-dark-gray">{conversation.title}</div>
                          <div className="text-xs text-medium-gray truncate">{conversation.lastMessage}</div>
                        </div>
                        
                        <div className="flex gap-1 flex-shrink-0">
                          {/* Pinning is disabled for AI conversations */}
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("Delete this conversation?")) {
                                deleteConversation(conversation.id);
                              }
                            }} 
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-base-300 text-base-content/60 hover:text-error transition-colors" 
                            title="Delete conversation"
                            aria-label="Delete conversation"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"></path>
                            </svg>
                          </button>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center text-zinc-500 py-8">
                      <img src="/images/ai-logo.svg" alt="LynqIt AI" className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="mb-2">No conversations yet</p>
                      <p className="text-sm">Click "New Chat" to start talking with LynqIt AI</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Group Create Modal */}
      <GroupCreateModal
        isOpen={showGroupCreateModal}
        onClose={() => setShowGroupCreateModal(false)}
      />

      {/* Status Create Modal */}
      <StatusCreateModal
        isOpen={showStatusCreateModal}
        onClose={() => setShowStatusCreateModal(false)}
        defaultPrivacy={defaultPrivacy}
      />

      {/* Status Viewer */}
      <StatusViewer
        isOpen={showStatusViewer}
        onClose={() => setShowStatusViewer(false)}
        contactStatuses={getCombinedStatusesForViewer()}
        initialContactIndex={statusViewerData.contactIndex === -1 ? 0 : (statusViewerData.contactIndex + (myStatuses.length > 0 ? 1 : 0))}
        initialStatusIndex={statusViewerData.statusIndex}
      />
      
      {/* Global Search Modal */}
      {authUser && (
        <GlobalSearchModal
          isOpen={showGlobalSearch}
          onClose={() => setShowGlobalSearch(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
