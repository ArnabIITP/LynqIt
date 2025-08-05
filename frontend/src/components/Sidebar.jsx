import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useStatusStore } from "../store/useStatusStore";
import { useAuthStore } from "../store/useAuthStore";
import { useAIStore } from "../store/useAIStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import GroupCreateModal from "./GroupCreateModal";
import StatusCreateModal from "./StatusCreateModal";
import StatusViewer from "./StatusViewer";
import PinButton from "./PinButton";
import { Search, Plus, MessageCircle, Circle, Camera, Lightbulb, Trash2, X } from "lucide-react";

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

  const { onlineUsers, authUser, socket } = useAuthStore();

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

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState(propActiveTab || "chats"); // "chats", "status", "groups", or "assistant"
  const [showGroupCreateModal, setShowGroupCreateModal] = useState(false);
  const [showStatusCreateModal, setShowStatusCreateModal] = useState(false);
  const [showStatusViewer, setShowStatusViewer] = useState(false);
  const [statusViewerData, setStatusViewerData] = useState({ contactIndex: 0, statusIndex: 0 });
  
  // Update active tab when prop changes
  useEffect(() => {
    if (propActiveTab) {
      setActiveTab(propActiveTab);
    }
  }, [propActiveTab]);

  useEffect(() => {
    getUsers(); // Get users with existing conversations
    getGroups(); // Get user's groups
    getMyStatuses(); // Get my statuses
    getContactStatuses(); // Get contact statuses
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

  useEffect(() => {
    // When search query is entered, get all users for search suggestions
    if (searchQuery.trim()) {
      setIsSearching(true);
      getAllUsers();
    } else {
      setIsSearching(false);
    }
  }, [searchQuery, getAllUsers]);

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
  const displayUsers = isSearching
    ? allUsers
        .filter((user) => user._id !== authUser._id)
        .filter((user) =>
          user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
        )
    : users.filter((user) => user._id !== authUser._id);

  // Filter groups based on search
  const displayGroups = isSearching
    ? groups.filter((group) =>
        group.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : groups;

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
      setSearchQuery("");
      return;
    }
    
    // For other tabs, deselect AI
    deselectAI();
    setActiveTab(tab);
    setSelectedUser(null);
    setSelectedGroup(null);
    setSearchQuery("");
  };

  // Handle group selection
  const handleGroupSelect = async (group) => {
    deselectAI(); // Deselect AI when selecting a group
    await setSelectedGroup(group);
    setSelectedUser(null);
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
  const handleStatusClick = (contactIndex, statusIndex = 0) => {
    setStatusViewerData({ contactIndex, statusIndex });
    setShowStatusViewer(true);
  };

  // Handle my status click - only view if statuses exist
  const handleMyStatusClick = () => {
    if (myStatuses.length > 0) {
      setStatusViewerData({ contactIndex: -1, statusIndex: 0 }); // -1 indicates my status
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

  if (isUsersLoading || isGroupsLoading) return <SidebarSkeleton />;

  return (
    <>
      <aside className="h-full w-20 lg:w-80 min-w-20 lg:min-w-80 max-w-20 lg:max-w-80 border-r border-base-300/50 flex flex-shrink-0 bg-gradient-to-b from-base-100 to-base-200/30 z-20 relative overflow-hidden">
        {/* WhatsApp-style vertical tabs */}
        <div className="w-20 bg-gradient-to-b from-base-200/80 to-base-300/50 border-r border-base-300/30 flex flex-col items-center py-4 gap-4">
          {/* Profile Picture */}
          <Link to="/profile" className="relative">
            <img
              src={authUser?.profilePic || "/avatar.png"}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
              title={`${authUser?.fullName} - Click to view profile`}
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-base-200"></div>
          </Link>

          {/* Tab Icons */}
          <div className="flex flex-col gap-4">
            {/* Chats Tab */}
            <button
              onClick={() => handleTabSwitch("chats")}
              className={`relative p-3 rounded-xl transition-all duration-200 ${
                activeTab === "chats"
                  ? "bg-primary text-primary-content"
                  : "bg-base-100 text-base-content hover:bg-base-300"
              }`}
              title="Chats"
            >
              <MessageCircle size={20} />
              {(unreadCounts.totalPersonal > 0) && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-error text-error-content rounded-full flex items-center justify-center text-xs font-bold">
                  {unreadCounts.totalPersonal > 9 ? '9+' : unreadCounts.totalPersonal}
                </div>
              )}
            </button>

            {/* Status Tab */}
            <button
              onClick={() => handleTabSwitch("status")}
              className={`relative p-3 rounded-xl transition-all duration-200 ${
                activeTab === "status"
                  ? "bg-primary text-primary-content"
                  : "bg-base-100 text-base-content hover:bg-base-300"
              }`}
              title="Status"
            >
              <Circle size={20} />
              {/* Status indicator for new status updates */}
              {getUnviewedStatusCount() > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {getUnviewedStatusCount() > 9 ? '9+' : getUnviewedStatusCount()}
                </div>
              )}
            </button>

            {/* Groups Tab */}
            <button
              onClick={() => handleTabSwitch("groups")}
              className={`relative p-3 rounded-xl transition-all duration-200 ${
                activeTab === "groups"
                  ? "bg-primary text-primary-content"
                  : "bg-base-100 text-base-content hover:bg-base-300"
              }`}
              title="Groups"
            >
              <span className="text-lg">👥</span>
              {(unreadCounts.totalGroups > 0 || unreadCounts.totalMentions > 0) && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-error text-error-content rounded-full flex items-center justify-center text-xs font-bold">
                  {(unreadCounts.totalGroups + unreadCounts.totalMentions) > 9 ? '9+' : (unreadCounts.totalGroups + unreadCounts.totalMentions)}
                </div>
              )}
            </button>
            
            {/* LynqIt AI Tab */}
            <button
              onClick={() => handleTabSwitch("assistant")}
              className={`relative p-3 rounded-xl transition-all duration-200 ${
                activeTab === "assistant"
                  ? "bg-primary text-primary-content"
                  : "bg-base-100 text-base-content hover:bg-base-300"
              }`}
              title="LynqIt AI"
            >
              <Lightbulb size={20} />
            </button>
          </div>

          {/* Create Button */}
          <div className="mt-auto">
            {activeTab === "groups" && (
              <button
                onClick={() => setShowGroupCreateModal(true)}
                className="p-3 bg-primary text-primary-content rounded-xl hover:bg-primary/80 transition-colors shadow-lg"
                title="Create Group"
              >
                <Plus size={20} />
              </button>
            )}
            {activeTab === "status" && (
              <button
                onClick={() => setShowStatusCreateModal(true)}
                className="p-3 bg-primary text-primary-content rounded-xl hover:bg-primary/80 transition-colors shadow-lg"
                title="Add Status"
              >
                <Camera size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Content Area - Hidden on mobile, shown on lg+ */}
        <div className="hidden lg:flex flex-1 flex-col">
          {/* Header with Search */}
          <div className="border-b border-base-300 p-4 px-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {activeTab === "chats" && "Chats"}
                {activeTab === "status" && "Status"}
                {activeTab === "groups" && "Groups"}
                {activeTab === "assistant" && "LynqIt AI"}
              </h2>

              {activeTab === "groups" && (
                <button
                  onClick={() => setShowGroupCreateModal(true)}
                  className="btn btn-ghost btn-sm btn-circle lg:hidden"
                  title="Create Group"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>

            {/* Search Bar */}
            <div className="flex items-center gap-2 bg-base-200/80 px-3 py-2.5 rounded-xl border border-base-300/30 backdrop-blur-sm hover:bg-base-200 transition-colors mx-1">
              <Search className="w-4 h-4 text-primary/70" />
              <input
                type="text"
                placeholder={
                  activeTab === "chats" ? "Search chats..." :
                  activeTab === "status" ? "Search status..." :
                  activeTab === "assistant" ? "Search conversations..." :
                  "Search groups..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm w-full focus:outline-none placeholder:text-base-content/50"
              />
            </div>
          </div>

          {/* Content List */}
          <div className="overflow-y-auto flex-1 py-3">
            {activeTab === "chats" ? (
              // Display users/chats
            <>
              {displayUsers.map((user) => {
                const unreadCount = unreadCounts.personal?.[user._id] || 0;

                return (
                  <button
                    key={user._id}
                    onClick={() => handleUserSelect(user)}
                    className={`group w-full p-3 flex items-center gap-3 hover:bg-base-300/60 transition-all duration-200 rounded-lg mx-2 ${selectedUser?._id === user._id ? "bg-primary/10 border border-primary/20 shadow-sm" : "hover:shadow-sm"}`}
                  >
                    <div className="relative mx-auto lg:mx-0">
                      <img
                        src={user.profilePic || "/avatar.png"}
                        alt={user.username}
                        className="size-12 object-cover rounded-full"
                      />
                      {onlineUsers.includes(user._id) && (
                        <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-zinc-900" />
                      )}
                    </div>

                    <div className="hidden lg:block text-left min-w-0 flex-1 max-w-[160px]">
                      <div className="font-medium truncate flex items-center gap-2">
                        <span className="truncate">{user.fullName}</span>
                        {user.isPinned && (
                          <span className="text-primary flex-shrink-0" title="Pinned">📌</span>
                        )}
                      </div>
                      <div className="text-sm text-zinc-400 truncate">@{user.username}</div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Pin Button */}
                      <PinButton
                        itemId={user._id}
                        itemType="chat"
                        isPinned={user.isPinned || false}
                        onPinToggle={handleChatPinToggle}
                        className="opacity-60 group-hover:opacity-100 transition-opacity"
                        asDiv={true}
                        iconOnly={true}
                      />

                      {/* Unread message count badge */}
                      {unreadCount > 0 && (
                        <div className="flex items-center justify-center min-w-5 h-5 rounded-full bg-primary text-primary-content text-xs font-medium">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}

              {searchQuery && displayUsers.length === 0 && (
                <div className="text-center text-zinc-500 py-4">No users found</div>
              )}

              {!searchQuery && displayUsers.length === 0 && (
                <div className="text-center text-zinc-500 py-4">No conversations yet</div>
              )}
            </>
            ) : activeTab === "status" ? (
              // Display status updates
              <>
                {/* My Status */}
                <div className="px-4 mb-4">
                  <div
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      myStatuses.length > 0 ? 'hover:bg-base-300 cursor-pointer' : 'cursor-default'
                    }`}
                    onClick={handleMyStatusClick}
                  >
                    <div className="relative">
                      <img
                        src={authUser?.profilePic || "/avatar.png"}
                        alt="My Status"
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      {/* No plus sign - removed */}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">My status</div>
                      <div className="text-sm text-base-content/60">
                        {myStatuses.length > 0 ? `${myStatuses.length} update${myStatuses.length > 1 ? 's' : ''}` : 'No status updates'}
                      </div>
                    </div>
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
                      {group.avatar ? (
                        <img
                          src={group.avatar}
                          alt={group.name}
                          className="size-12 object-cover rounded-full"
                        />
                      ) : (
                        <div className="size-12 bg-primary/20 rounded-full flex items-center justify-center">
                          <span className="text-primary text-xl">👥</span>
                        </div>
                      )}
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

              {searchQuery && displayGroups.length === 0 && (
                <div className="text-center text-zinc-500 py-4">No groups found</div>
              )}

              {!searchQuery && displayGroups.length === 0 && (
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
                    <h3 className="font-semibold text-base-content/80">AI Conversations</h3>
                  </div>
                  <button
                    onClick={startNewConversation}
                    className="w-full btn btn-sm btn-primary flex items-center justify-center"
                  >
                    New Chat
                  </button>
                </div>
                
                {/* AI conversation history */}
                <div className="flex-1 overflow-y-auto px-2 pb-2">
                  {searchConversations(searchQuery).length > 0 ? (
                    searchConversations(searchQuery).map((conversation) => (
                      <button
                        key={conversation.id}
                        onClick={() => {
                          // Only select the conversation, don't trigger a new message generation
                          selectConversation(conversation.id);
                        }}
                        className={`w-full py-2 px-3 flex items-center gap-2 hover:bg-base-300/60 transition-all duration-200 rounded-lg mb-1.5 mx-2 text-left
                          ${selectedHistoryId === conversation.id ? "bg-primary/10 border border-primary/20 shadow-sm" : "hover:shadow-sm"}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <Lightbulb size={16} className="text-blue-500" />
                        </div>
                        
                        <div className="text-left min-w-0 flex-1 max-w-[150px]">
                          <div className="font-medium truncate text-sm">{conversation.title}</div>
                          <div className="text-xs text-base-content/60 truncate">{conversation.lastMessage}</div>
                        </div>
                        
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
                      </button>
                    ))
                  ) : searchQuery ? (
                    <div className="text-center py-8 text-base-content/60">
                      <Search size={32} className="mx-auto mb-2 opacity-50" />
                      <p>No conversations found</p>
                      <p className="text-xs mt-1">Try a different search term</p>
                    </div>
                  ) : (
                    <div className="text-center text-zinc-500 py-8">
                      <Lightbulb size={48} className="mx-auto mb-3 opacity-50" />
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
      />

      {/* Status Viewer */}
      <StatusViewer
        isOpen={showStatusViewer}
        onClose={() => setShowStatusViewer(false)}
        contactStatuses={getCombinedStatusesForViewer()}
        initialContactIndex={statusViewerData.contactIndex === -1 ? 0 : (statusViewerData.contactIndex + (myStatuses.length > 0 ? 1 : 0))}
        initialStatusIndex={statusViewerData.statusIndex}
      />
    </>
  );
};

export default Sidebar;
