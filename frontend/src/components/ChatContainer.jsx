import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useAIStore } from "../store/useAIStore";
import { useEffect, useRef, useState } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import AIChatContainer from "./AIChatContainer";
import { useAuthStore } from "../store/useAuthStore";
import CustomLinkPreview from "./CustomLinkPreview";
import { formatMessageTime, groupMessagesByDate, formatStatusTime } from "../utils/dateUtils";
import DateSeparator from "./DateSeparator";
import { X, FileText, Film, Smile, Check, Info, Trash2, MoreVertical, AlertCircle, AlertTriangle, RefreshCw, Edit, Hash, AtSign, Reply, Flag, Send } from "lucide-react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import LocationMessage from "./LocationMessage";
import PollEventBubble from "./PollEventBubble";
import axios from "axios";
import { axiosInstance } from "../lib/axios";
  // Poll/Event voting/RSVP handlers with optimistic UI update (socket will sync authoritative state)
  const handleVote = async (message, selection) => {
    try {
      const payload = Array.isArray(selection)
        ? { optionIndexes: selection }
        : { optionIndex: selection };

      await axiosInstance.post(`/poll/${message._id}/vote`, payload);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to vote");
    }
  };
  const handleRsvp = async (message, status) => {
    try {
      await axiosInstance.post(`/event/${message._id}/rsvp`, { status });
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to RSVP");
    }
  };
import EmojiPicker from "emoji-picker-react";
import EditMessageModal from "./EditMessageModal";
import ForwardMessageModal from "./ForwardMessageModal";
import ReplyMessage from "./ReplyMessage";
import ReportMessageButton from "./ReportMessageButton";
import MessageStatusIndicator from "./MessageStatusIndicator";
import toast from "react-hot-toast";
import "./chat-bubbles.css";
// Encryption imports removed - encryption disabled

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    reactToMessage,
    deleteMessage,
    connectionStatus,
    handleSocketReconnect,
    isDeletingMessage,
    setReplyingTo,
    markMessagesAsSeen,
    markChatAsRead
  } = useChatStore();

  const {
    selectedGroup,
    groupMessages,
    getGroupMessages,
    isGroupMessagesLoading,
    sendGroupMessage,
    markGroupAsRead
  } = useGroupStore();

  // Decryption removed - all messages are plain text

  // Add AI assistant store
  const { isSelected: isAISelected } = useAIStore();

  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const emojiPickerRef = useRef(null);
  const moreOptionsRef = useRef(null);
  const contextMenuRef = useRef(null);
  const [showMessageOptions, setShowMessageOptions] = useState(null);
  const [timeFormatKey, setTimeFormatKey] = useState(0); // Force re-render when time format changes
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);
  // Encryption and decryption removed - all messages are plain text

  // Common reaction emojis for quick access
  const quickReactions = ["👍", "❤️", "😂", "😮", "😢", "😡"];

  // Determine if we're in group or direct chat mode
  const isGroupChat = !!selectedGroup;
  const currentMessages = isGroupChat ? groupMessages : messages;
  const isCurrentMessagesLoading = isGroupChat ? isGroupMessagesLoading : isMessagesLoading;

  useEffect(() => {
    if (selectedUser) {
      getMessages(selectedUser._id);
    }
  }, [selectedUser, getMessages]);

  // Mark messages as seen and chat/group as read when messages are loaded and chat is open
  useEffect(() => {
    if (selectedUser && messages && messages.length > 0) {
      // Direct chat
      const unreadMessageIds = messages
        .filter(m => m.status !== 'seen' && m.receiverId === authUser._id)
        .map(m => m._id);
      if (unreadMessageIds.length > 0) {
        markMessagesAsSeen(unreadMessageIds);
      }
      markChatAsRead('direct', selectedUser._id);
    } else if (selectedGroup && groupMessages && groupMessages.length > 0) {
      // Group chat
      const unreadGroupMessageIds = groupMessages
        .filter(m => {
          // Check group read receipts for this user
          if (!m.groupReadReceipts) return false;
          const receipt = m.groupReadReceipts.find(r => r.userId === authUser._id);
          return receipt && receipt.status !== 'seen';
        })
        .map(m => m._id);
      if (unreadGroupMessageIds.length > 0) {
        markMessagesAsSeen(unreadGroupMessageIds);
      }
      if (markGroupAsRead) markGroupAsRead(selectedGroup._id);
    }
  }, [selectedUser, messages, selectedGroup, groupMessages, authUser, markMessagesAsSeen, markChatAsRead, markGroupAsRead]);

  useEffect(() => {
    if (selectedGroup) {
      getGroupMessages(selectedGroup._id);
    }
  }, [selectedGroup, getGroupMessages]);

  useEffect(() => {
    if (messageEndRef.current && currentMessages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentMessages]);

  // Decryption removed - all messages are processed as plain text
  useEffect(() => {
    // Handle click outside for emoji picker and message options
    const handleClickOutside = (e) => {
      // Close emoji picker if clicked outside
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowReactionPicker(null);
      }

      // Close message options if clicked outside
      if (showMessageOptions && moreOptionsRef.current && !moreOptionsRef.current.contains(e.target)) {
        // Check if the click was on a menu toggle button
        const isMenuToggleClick = e.target.closest('[data-message-menu-toggle]');
        if (!isMenuToggleClick) {
          console.log("Clicked outside message options, closing menu");
          setShowMessageOptions(null);
        }
      }

      // Close context menu if clicked outside
      if (showContextMenu && contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setShowContextMenu(null);
      }
    };

    // Add event listener when any menu is open
    if (showReactionPicker || showMessageOptions || showContextMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showReactionPicker, showMessageOptions, showContextMenu]);

  useEffect(() => {
    // If connection is lost, try to reconnect after a delay
    if (connectionStatus === 'disconnected') {
      const reconnectTimer = setTimeout(() => {
        handleSocketReconnect();
      }, 3000);

      return () => clearTimeout(reconnectTimer);
    }
  }, [connectionStatus, handleSocketReconnect]);

  // Add polling for messages when the socket is disconnected but we have an active chat
  useEffect(() => {
    let pollingInterval;

    if (connectionStatus !== 'connected' && (selectedUser || selectedGroup)) {
      // Poll for new messages every 5 seconds when socket is disconnected
      pollingInterval = setInterval(() => {
        console.log("Polling for new messages due to disconnected socket");
        if (selectedUser) {
          getMessages(selectedUser._id);
        } else if (selectedGroup) {
          getGroupMessages(selectedGroup._id);
        }
      }, 5000);
    }

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [connectionStatus, selectedUser, selectedGroup, getMessages, getGroupMessages]);

  // Check for connection and active chat after component mounts
  useEffect(() => {
    if ((selectedUser || selectedGroup) && connectionStatus !== 'connected') {
      // Try to reconnect if we have a selected user/group but no connection
      handleSocketReconnect();
    }
  }, [selectedUser, selectedGroup, connectionStatus, handleSocketReconnect]);

  // Listen for time format changes
  useEffect(() => {
    const handleTimeFormatChange = () => {
      setTimeFormatKey(prev => prev + 1);
    };

    window.addEventListener('timeFormatChanged', handleTimeFormatChange);
    return () => window.removeEventListener('timeFormatChanged', handleTimeFormatChange);
  }, []);

  // Encryption completely removed

  // Helper function for downloading any file through backend proxy
  const downloadFile = (url, fileName) => {
    // Log attempt
    console.log(`📄 Attempting to download: ${fileName || 'Document'} from ${url}`);
    
    // Create a server-side proxy endpoint for document download
    const apiUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(fileName || 'document')}`;
    
    // Create an anchor element to trigger the download
    const link = document.createElement('a');
    link.href = apiUrl;
    link.download = fileName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`📄 Download initiated through server proxy: ${apiUrl}`);
  };
  
  const handleMediaClick = (url, type, fileName) => {
    // For documents, attempt to download using our helper
    if (type === 'document') {
      downloadFile(url, fileName);
      return;
    }
    
    // For videos and images, show in preview modal
    console.log(`🔍 Opening ${type} preview: ${fileName || type}`);
    setPreviewMedia({ url, type, fileName });
  };

  const closePreview = () => {
    setPreviewMedia(null);
  };

  const handleMessageInfo = (message) => {
    setSelectedMessage(message);
    setShowInfoModal(true);
  };
  const openDeleteModal = (message) => {
    console.log("Opening delete modal for message:", message);
    // First close the dropdown menu
    setShowMessageOptions(null);
    // Then set up the delete modal
    setTimeout(() => {
      setSelectedMessage(message);
      setShowDeleteModal(true);
    }, 10);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedMessage(null);
  };
  const handleDeleteMessage = (deleteType) => {
    if (selectedMessage) {
      console.log(`Deleting message ${selectedMessage._id} with type: ${deleteType}`);
      // Show an alert for debugging
      alert(`Attempting to delete message: ${deleteType}`);
      // Call the deleteMessage function from useChatStore
      deleteMessage(selectedMessage._id, deleteType);
      closeDeleteModal();
    } else {
      console.error("No message selected for deletion");
      alert("Error: No message selected for deletion");
    }
  };
    const toggleMessageOptions = (messageId, event) => {
    event.stopPropagation();
    console.log("Toggle menu for message:", messageId, "Current state:", showMessageOptions);

    // If this message's menu is already open, close it
    if (showMessageOptions === messageId) {
      setShowMessageOptions(null);
    } else {
      // Otherwise, close any open menu and open this one
      setShowMessageOptions(messageId);
    }
  };

  const closeInfoModal = () => {
    setSelectedMessage(null);
    setShowInfoModal(false);
  };

  const handleReaction = (messageId, emoji) => {
    reactToMessage(messageId, emoji);
    setShowReactionPicker(null);
  };

  const handleQuickReaction = (messageId, emoji) => {
    reactToMessage(messageId, emoji);
  };

  const getReactionCount = (reactions) => {
    if (!reactions || reactions.length === 0) return {};

    // Count each emoji type
    const counts = {};
    reactions.forEach(reaction => {
      counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1;
    });

    return counts;
  };

  const getUserReaction = (reactions) => {
    if (!reactions || !authUser) return null;

    const userReaction = reactions.find(reaction =>
      reaction.userId.toString() === authUser._id.toString()
    );

    return userReaction ? userReaction.emoji : null;
  };

  // hasUserReacted function removed as it's not used

  // Check if message is deletable for everyone (within 24 hours from sent time)
  const canDeleteForEveryone = (message) => {
    const senderId = typeof message.senderId === 'object' ? (message.senderId?._id || message.senderId?.toString?.()) : message.senderId;
    if (!authUser || senderId?.toString() !== authUser._id?.toString()) return false;

    const messageDate = new Date(message.createdAt);
    const now = new Date();
    const hoursDiff = (now - messageDate) / (1000 * 60 * 60);
    return hoursDiff <= 24; // within 24 hours
  };

  const getDeleteForEveryoneTimeLeft = (message) => {
    const messageDate = new Date(message.createdAt);
    const now = new Date();
    const msLeft = 24 * 60 * 60 * 1000 - (now - messageDate);
    if (msLeft <= 0) return 'Expired';
    const hours = Math.floor(msLeft / (1000 * 60 * 60));
    const minutes = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  // Check if message is editable (within 15 minutes)
  const canEditMessage = (message) => {
    if (message.senderId !== authUser._id) return false;
    if (message.isDeleted) return false;

    const messageDate = new Date(message.createdAt);
    const now = new Date();
    const minutesDiff = (now - messageDate) / (1000 * 60);

    return minutesDiff <= 15; // Can edit within 15 minutes
  };

  const handleEditMessage = (message) => {
    setSelectedMessage(message);
    setShowEditModal(true);
    setShowMessageOptions(null);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedMessage(null);
  };

  // Handle right-click context menu
  const handleRightClick = (e, message) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(message._id);
    setSelectedMessage(message);
  };

  // Handle reply to message
  const handleReplyToMessage = (message) => {
    setReplyingTo(message);
    setShowContextMenu(null);
    // Ensure we have proper sender information for the reply preview
    const enhancedMessage = { ...message };

    // If senderId is just a string, try to get the full user info
    if (typeof message.senderId === 'string') {
      // Check if it's the current user
      if (message.senderId === authUser._id) {
        enhancedMessage.senderId = {
          _id: authUser._id,
          fullName: authUser.fullName,
          username: authUser.username,
          profilePic: authUser.profilePic
        };
      } else if (isGroupChat && selectedGroup?.members) {
        // For group chats, find the member info
        const member = selectedGroup.members.find(m =>
          m.user._id === message.senderId
        );
        if (member) {
          enhancedMessage.senderId = {
            _id: member.user._id,
            fullName: member.user.fullName,
            username: member.user.username,
            profilePic: member.user.profilePic
          };
        }
      } else if (!isGroupChat && selectedUser) {
        // For direct chats, use the selected user info
        enhancedMessage.senderId = {
          _id: selectedUser._id,
          fullName: selectedUser.fullName,
          username: selectedUser.username,
          profilePic: selectedUser.profilePic
        };
      }
    }

    setReplyingTo(enhancedMessage);
    setShowContextMenu(null);
    setShowMessageOptions(null);
  };

  // Handle forward message
  const handleForwardMessage = (message) => {
    setMessageToForward(message);
    setShowForwardModal(true);
    setShowContextMenu(null);
    setShowMessageOptions(null);
  };

  // Scroll to a specific message
  const scrollToMessage = (messageId) => {
    console.log('🔍 Scrolling to message:', messageId);

    // Find the message element by ID
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);

    if (messageElement) {
      // Scroll to the message with smooth behavior
      messageElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });

      // Add a temporary highlight effect (stronger for mention jumps)
      messageElement.classList.add('ring-4', 'ring-error', 'bg-error/20', 'transition-all', 'duration-700');
      setTimeout(() => {
        messageElement.classList.remove('ring-4', 'ring-error', 'bg-error/20', 'transition-all', 'duration-700');
      }, 1800);

      console.log('✅ Scrolled to message:', messageId);
    } else {
      console.warn('⚠️ Message not found in DOM:', messageId);

      // If message is not in current view, we might need to load more messages
      // For now, just show a toast notification
      toast.info('Message not visible in current chat history');
    }
  };



  const formatDetailedTime = (timestamp) => {
    if (!timestamp) return "Pending";
    return formatStatusTime(timestamp);
  };

  // Render message text with mentions highlighted (no decryption needed)
  const renderMessageText = (message) => {
    if (!message.text) return null;

    let text = message.text;

    // Highlight mentions (WhatsApp-style blue)
    if (isGroupChat && message.mentions && message.mentions.length > 0) {
      message.mentions.forEach(mention => {
        const mentionRegex = new RegExp(`@${mention.username}`, 'gi');
        const mentionStyle = `<span class=\"wa-mention\">@${mention.username}</span>`;
        text = text.replace(mentionRegex, mentionStyle);
      });
    }

    // Detect and replace URLs with clickable links
    // Group join link pattern: e.g. https://lynqit.com/join/group/abc123
    const groupJoinRegex = /https?:\/\/(lynqit\.com|localhost:\d+|127\.0\.0\.1:\d+)\/join\/group\/([a-zA-Z0-9_-]+)/g;
    const urlRegex = /((https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?)/gi;

    // Replace group join links with a special clickable span
    text = text.replace(groupJoinRegex, (match, domain, groupId) => {
      return `<span class=\"wa-link wa-group-join-link\" data-group-id=\"${groupId}\">${match}</span>`;
    });

    // Replace other URLs with anchor tags (skip already replaced group join links)
    text = text.replace(urlRegex, (url) => {
      // If already replaced as group join, skip
      if (url.includes('wa-group-join-link')) return url;
      let href = url;
      if (!href.startsWith('http')) href = 'https://' + href;
      return `<a href=\"${href}\" class=\"wa-link\" target=\"_blank\" rel=\"noopener noreferrer\">${url}</a>`;
    });

    // Handler for group join link click
    const handleGroupJoinClick = (e) => {
      const target = e.target;
      if (target.classList.contains('wa-group-join-link')) {
        e.preventDefault();
        const groupId = target.getAttribute('data-group-id');
        // Show group join popup/modal (implement your modal logic here)
        toast((t) => (
          <div>
            <b>Join Group</b>
            <div>Would you like to join group <span className="font-mono">{groupId}</span>?</div>
            <button className="btn btn-primary btn-sm mt-2" onClick={() => { toast.dismiss(t.id); /* trigger join logic here */ }}>Join</button>
            <button className="btn btn-ghost btn-sm mt-2 ml-2" onClick={() => toast.dismiss(t.id)}>Cancel</button>
          </div>
        ), { duration: 6000 });
      }
    };

    return (
      <div
        className="break-words"
        dangerouslySetInnerHTML={{ __html: text }}
        onClick={handleGroupJoinClick}
      />
    );
  };

  const renderMediaContent = (message) => {
    if (!message.image) return null;

    // Get sender info for determining if this is the user's message
    const isMyMessage = message.senderId === authUser._id || message.senderId._id === authUser._id;
    const bgClass = isMyMessage ? 'bg-primary-content/10' : 'bg-base-300';
    const textClass = isMyMessage ? 'text-primary-content' : 'text-base-content';
    
    // Check if message is in sending state
    const isSending = message.status === 'sending';

    // Function to render caption if exists
    const renderCaption = () => {
      if (!message.caption) return null;
      return (
        <div className={`text-sm italic mt-1 ${textClass}`}>
          {message.caption}
        </div>
      );
    };

    // Get file size in readable format
    const formatFileSize = (bytes) => {
      if (!bytes) return '';
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    };

    // Format seconds to mm:ss
    const formatDuration = (seconds) => {
      if (!seconds && seconds !== 0) return '';
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
    };
    
    // Log and potentially fix mediaType issues
    console.log('🖼️ Rendering media content:', { 
      mediaType: message.mediaType, 
      url: message.image?.substring(0, 50) + '...',
      fileName: message.fileName
    });
    
    // Check if URL suggests it's a video but mediaType doesn't match
    let effectiveMediaType = message.mediaType;
    if (message.image) {
      const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v'];
      const isVideoByExtension = videoExtensions.some(ext => 
        message.image.toLowerCase().includes(ext)
      );
      
      if (isVideoByExtension && effectiveMediaType !== 'video') {
        console.log('🎬 URL contains video extension but mediaType is not video, correcting');
        effectiveMediaType = 'video';
      }
    }

    // Custom audio bubble component (for 'audio' and 'music')
    const AudioMessageBubble = ({ message, isMyMessage }) => {
      const [isPlaying, setIsPlaying] = useState(false);
      const [duration, setDuration] = useState(null);
      const [currentTime, setCurrentTime] = useState(0);
      const [playbackRate, setPlaybackRate] = useState(1);
      const audioRef = useRef(null);

      const isSending = message.status === 'sending';
      const isUploading = (message.uploadProgress !== undefined && message.uploadProgress < 100) || isSending;
      const progress = message.uploadProgress || (isSending ? 0 : 100);

      const handleTogglePlay = (e) => {
        e.stopPropagation();
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.paused) {
          audio.play();
        } else {
          audio.pause();
        }
      };

      const onSeek = (e) => {
        const audio = audioRef.current;
        if (!audio || !duration) return;
        const value = Number(e.target.value);
        audio.currentTime = value;
        setCurrentTime(value);
      };

      const cycleSpeed = (e) => {
        e.stopPropagation();
        const next = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
        setPlaybackRate(next);
        if (audioRef.current) audioRef.current.playbackRate = next;
      };

      return (
        <div className="flex flex-col">
          <div className={`relative rounded-md mb-1 ${bgClass} p-2 flex items-center gap-3`}>
            {/* Left: uploading percent or play/pause */}
            {isUploading ? (
              <div className="relative h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center border border-gray-300">
                <span className="text-[10px] font-semibold text-gray-700">{progress}%</span>
              </div>
            ) : (
              <button
                onClick={handleTogglePlay}
                className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${isMyMessage ? 'bg-primary/90 text-white hover:bg-primary' : 'bg-base-200 text-base-content hover:bg-base-300'}`}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  // Pause icon
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>
                ) : (
                  // Play icon
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>
            )}

            {/* Middle: filename + meta + progress bar */}
            <div className="flex flex-col flex-1 min-w-0">
              <span className={`text-sm font-medium truncate ${textClass}`}>
                {message.fileName || 'Audio'}
              </span>
              <span className={`text-xs ${textClass} opacity-70`}>
                {duration ? `${formatDuration(duration)} • ` : ''}{message.fileSize ? formatFileSize(message.fileSize) : ''}
              </span>
              {isUploading && (
                <div className="w-full h-1 bg-gray-200 rounded mt-1">
                  <div className="h-1 bg-tangerine rounded" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>

            {/* Hidden audio element */}
            <audio
              ref={audioRef}
              src={message.image}
              preload="metadata"
              onLoadedMetadata={(e) => {
                setDuration(e.currentTarget.duration);
                setCurrentTime(0);
                if (audioRef.current) audioRef.current.playbackRate = playbackRate;
              }}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
              className="hidden"
            />
          </div>
          {/* Seek and speed controls */}
          {!isUploading && (
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] ${textClass} opacity-70 w-8 text-right`}>{formatDuration(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={Math.min(currentTime, duration || 0)}
                onChange={onSeek}
                className="range range-xs flex-1"
              />
              <span className={`text-[10px] ${textClass} opacity-70 w-8`}>{formatDuration(duration || 0)}</span>
              <button onClick={cycleSpeed} className={`px-2 py-0.5 rounded text-xs border ${isMyMessage ? 'border-primary/40' : 'border-base-300'}`} title="Playback speed">
                {playbackRate}x
              </button>
            </div>
          )}
          {renderCaption()}
        </div>
      );
    };

    switch (effectiveMediaType) {
      case 'video': {
        // Show upload progress if available (optimistic UI) or message is sending
        const isUploading = (message.uploadProgress !== undefined && message.uploadProgress < 100) || isSending;
        const progress = message.uploadProgress || (isSending ? 0 : 100);
        return (
          <div className="flex flex-col">
            <div
              className={`relative rounded-md mb-1 cursor-pointer hover:opacity-90 transition-opacity ${bgClass} p-2 flex items-center gap-2`}
              onClick={() => handleMediaClick(message.image, 'video', message.fileName)}
            >
              {/* Left: icon or spinner when uploading */}

              {/* Video thumbnail or spinner */}
              {isUploading ? (
                <div className="relative w-14 h-10 bg-gray-100 rounded flex items-center justify-center border border-gray-200 overflow-hidden">
                  <svg className="h-6 w-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-200">
                    <div className="h-full bg-tangerine" style={{ width: `${progress}%` }}></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                    <span className="text-xs font-medium text-white">{progress}%</span>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <video
                    src={message.image}
                    className="h-10 w-14 object-cover rounded shadow border border-gray-300 bg-black"
                    style={{ minWidth: 56, minHeight: 40 }}
                    preload="metadata"
                    onClick={e => { e.stopPropagation(); handleMediaClick(message.image, 'video', message.fileName); }}
                    tabIndex={-1}
                    poster=""
                    muted
                  />
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-5 w-5 bg-black/50 rounded-full flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="h-3 w-3 text-white" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              {/* Middle: filename + size + progress bar */}
              <div className="flex flex-col flex-1">
                <span className={`text-sm font-medium ${textClass}`}>
                  {message.fileName || 'Video'}
                </span>
                {message.fileSize && (
                  <span className={`text-xs ${textClass} opacity-70`}>
                    {formatFileSize(message.fileSize)}
                  </span>
                )}
                {isUploading && (
                  <div className="w-full h-1 bg-gray-200 rounded mt-1">
                    <div className="h-1 bg-tangerine rounded" style={{ width: `${progress}%` }} />
                  </div>
                )}
              </div>

              {/* Right: download button (disabled while uploading) */}
              {!isUploading && (
                <button
                  onClick={(e) => { e.stopPropagation(); downloadFile(message.image, message.fileName || 'Video'); }}
                  className="relative flex items-center justify-center group"
                  title="Download video"
                >
                  <svg className="h-6 w-6 text-gray-400 group-hover:text-tangerine transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                  </svg>
                </button>
              )}
            </div>
            {renderCaption()}
          </div>
        );
      }
      case 'document':
        // Show upload progress if available (optimistic UI)
        const isUploading = message.uploadProgress !== undefined && message.uploadProgress < 100;
        const progress = message.uploadProgress || 0;
        return (
          <div className="flex flex-col">
            <div
              className={`relative rounded-md mb-1 transition-opacity ${bgClass} p-2 flex items-center gap-2`}
            >
              {/* Animated icon: show progress spinner if uploading, else download icon */}
              {isUploading ? (
                <div className="relative flex items-center justify-center">
                  <svg className="animate-spin h-6 w-6 text-gray-400" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <span className="absolute text-xs font-bold text-gray-700">{progress}%</span>
                </div>
              ) : (
                <button
                  className="relative flex items-center justify-center group"
                  title="Download file"
                  onClick={() => downloadFile(message.image, message.fileName)}
                >
                  <svg className="h-6 w-6 text-gray-400 group-hover:text-tangerine transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                  </svg>
                </button>
              )}
              <div className="flex flex-col flex-1">
                <span className={`text-sm font-medium ${textClass}`}>
                  {message.fileName || 'Document'}
                </span>
                {message.fileSize && (
                  <span className={`text-xs ${textClass} opacity-70`}>
                    {formatFileSize(message.fileSize)}
                  </span>
                )}
                {/* Show progress bar if uploading */}
                {isUploading && (
                  <div className="w-full h-1 bg-gray-200 rounded mt-1">
                    <div
                      className="h-1 bg-tangerine rounded"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
            {renderCaption()}
          </div>
        );
      case 'audio':
      case 'music':
        return (
          <AudioMessageBubble message={message} isMyMessage={isMyMessage} />
        );
      case 'gif':
      case 'image':
      default:
        return (
          <div className="flex flex-col">
            <img
              src={message.image}
              alt={message.caption || "Attachment"}
              className="sm:max-w-[200px] rounded-md mb-1 cursor-pointer hover:opacity-90 transition-opacity border border-base-300"
              onClick={() => handleMediaClick(message.image, message.mediaType || 'image', message.fileName)}
            />
            {renderCaption()}
          </div>
        );
    }
  };

  const renderReactions = (message) => {
    if (!message.reactions || message.reactions.length === 0) return null;

    const reactionCounts = getReactionCount(message.reactions);
    const userReaction = getUserReaction(message.reactions);
    const isMyMessage = message.senderId === authUser._id;

    return (
      <div className={`flex flex-wrap gap-1 mt-1 ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
        {Object.entries(reactionCounts).map(([emoji, count]) => {
          const isUserReaction = userReaction === emoji;

          return (
            <button
              key={emoji}
              className={`text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1
                ${isUserReaction 
                  ? 'bg-primary/30 text-primary-content font-medium border border-primary/20' 
                  : 'bg-base-200 hover:bg-base-300 text-base-content border border-base-300'}`}
              onClick={() => handleQuickReaction(message._id, emoji)}
            >
              <span>{emoji}</span>
              {count > 1 && <span>{count}</span>}
            </button>
          );
        })}
      </div>
    );
  };



  const renderConnectionStatus = () => {
    if (connectionStatus === 'disconnected') {
      return (
        <div className="flex items-center justify-center my-2">
          <div className="bg-error/20 text-error px-4 py-2 rounded-full flex items-center gap-2 text-sm">
            <AlertTriangle size={16} />
            <span>Connection lost. Reconnecting...</span>
            <button
              className="btn btn-xs btn-error btn-outline ml-2"
              onClick={handleSocketReconnect}
            >
              <RefreshCw size={14} className="mr-1" />
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (connectionStatus === 'connecting') {
      return (
        <div className="flex items-center justify-center my-2">
          <div className="bg-warning/20 text-warning px-4 py-2 rounded-full flex items-center gap-2 text-sm">
            <span className="loading loading-spinner loading-xs"></span>
            <span>Connecting to chat server...</span>
          </div>
        </div>
      );
    }

    return null;
  };

  // Add a small floating connection indicator
  const renderFloatingConnectionStatus = () => {
    if (connectionStatus === 'connected') return null;

    const color = connectionStatus === 'connecting' ? 'warning' : 'error';
    const title = connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected';

    return (
      <div className={`fixed bottom-20 right-4 z-10 bg-${color}/20 text-${color} px-3 py-1.5 rounded-full
                      flex items-center gap-2 text-xs shadow-md border border-${color}/30`}
           title={title}>
        {connectionStatus === 'connecting' ? (
          <span className="loading loading-spinner loading-xs"></span>
        ) : (
          <AlertTriangle size={12} />
        )}
        <span>{connectionStatus === 'connecting' ? 'Connecting' : 'Offline'}</span>
      </div>
    );
  };



  if (isCurrentMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  // If AI Assistant is selected, show the AI chat interface
  if (isAISelected) {
    return <AIChatContainer />;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-base-100">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1.5">
        {renderConnectionStatus()}
        {groupMessagesByDate(currentMessages).map((group, groupIndex) => (
          <div key={`group-${groupIndex}`}> 
            {/* Date Separator */}
            <DateSeparator date={group.date} />

            {/* Messages for this date */}
            {group.messages.map((message) => {
          const isMyMessage = message.senderId === authUser._id || message.senderId._id === authUser._id;
          const userReaction = getUserReaction(message.reactions);

          // Get sender info for group messages
          const senderInfo = isGroupChat && !isMyMessage ?
            (message.senderId.fullName || message.senderId.username || 'Unknown User') : null;

          // If message is deleted and we're not supposed to see it, skip rendering
          if (message.isDeleted && message.deletedFor === 'everyone') {
            return (
          <div
            key={message._id}
            data-message-id={message._id}
                className={`chat ${isMyMessage ? "chat-end" : "chat-start"}`}
                ref={message === messages[messages.length - 1] ? messageEndRef : null}
          >
                <div className="chat-bubble bg-base-200 text-neutral-content italic shadow-message">
                  This message was deleted
                </div>
              </div>
            );
          }

          // If message is deleted just for me, don't show it
          if (message.isDeleted &&
              message.deletedFor === 'me' &&
              message.deletedBy === authUser._id) {
            return null;
          }

          // Check if the current user is mentioned in this message (for group chats)
          const isMentioned = isGroupChat && message.mentions && message.mentions.some(m => m._id === authUser._id || m.username === authUser.username);

          return (
            <div
              key={message._id}
              data-message-id={message._id}
              className={`chat ${isMyMessage ? "chat-end" : "chat-start"}`}
              ref={message === currentMessages[currentMessages.length - 1] ? messageEndRef : null}
            >
              {/* Show sender avatar for group chats */}
              {isGroupChat && (
                <div className="chat-image avatar">
                  <div className="w-10 rounded-full">
                    <img
                      src={message.senderId?.profilePic || "/avatar.png"}
                      alt="profile pic"
                    />
                  </div>
                </div>
              )}

              <div className="chat-header mb-1 flex items-center">
                {/* Show sender name in group chats */}
                {isGroupChat && !isMyMessage && (
                  <div className="text-sm font-medium text-base-content/90 mr-2">
                    {senderInfo}
                  </div>
                )}
                <time className="text-xs text-base-content/70 ml-1" key={`time-${timeFormatKey}`}>
                  {formatMessageTime(message.createdAt)}
                </time>
                {/* Removed inline 3-dot menu; use right-click context menu instead */}
              </div>
              <div
                className={`chat-bubble-custom flex flex-col group relative ${isMyMessage
                  ? 'own-message-bubble'
                  : 'other-message-bubble'} rounded-lg ${isMentioned ? 'ring-2 ring-error/70 bg-error/10 animate-pulse-short' : ''}`}
                onContextMenu={(e) => handleRightClick(e, message)}
                id={isMentioned ? `mention-${message._id}` : undefined}
              >
                {/* Show replied message if this is a reply */}
                {message.replyTo && (
                  <ReplyMessage
                    replyTo={message.replyTo}
                    onClick={() => scrollToMessage(message.replyTo._id)}
                  />
                )}

                {/* Show forwarded tag for forwarded messages */}
                {message.isForwarded && (
                  <div className="text-xs opacity-60 flex items-center gap-1 mb-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m13 9 2 2-2 2"/>
                      <path d="M5 5v14"/>
                      <path d="M9 9h8"/>
                    </svg>
                    <span>Forwarded</span>
                  </div>
                )}


                {/* Poll/Event bubble (use mediaType field from backend) */}
                {message.mediaType === 'poll' && message.poll && (
                  <PollEventBubble
                    message={message}
                    authUser={authUser}
                    onVote={sel => handleVote(message, sel)}
                  />
                )}
                {message.mediaType === 'event' && message.event && (
                  <PollEventBubble
                    message={message}
                    authUser={authUser}
                    onRsvp={status => handleRsvp(message, status)}
                  />
                )}


                {/* Location message card */}
                {message.type === "location" && message.lat && message.lng ? (
                  <>
                    <LocationMessage
                      lat={message.lat}
                      lng={message.lng}
                      address={message.address}
                      time={formatMessageTime(message.createdAt)}
                      status={message.status || "sent"}
                    />
                  </>
                ) : (
                  // Standard message content
                  message.mediaType !== 'poll' && message.mediaType !== 'event' && (
                    <>
                      {message.image && renderMediaContent(message)}
                      {message.text && (
                        <div>
                          {renderMessageText(message)}
                          {/* Link Preview: show for first URL in message */}
                          {(() => {
                            // Extract first URL from message text
                            const urlRegex = /https?:\/\/[\w.-]+(?:\.[\w\.-]+)+(?:[\w\-\._~:/?#[\]@!$&'()*+,;=]*)?/gi;
                            const urls = message.text.match(urlRegex);
                            if (urls && urls.length > 0) {
                              return <CustomLinkPreview url={urls[0]} />;
                            }
                            return null;
                          })()}
                          {message.isEdited && (
                            <span className="text-xs opacity-60 ml-1">(edited)</span>
                          )}
                        </div>
                      )}
                    </>
                  )
                )}

                {/* Status indicator for my messages (skip for location messages, handled inside LocationMessage) */}
                {!(message.type === "location" && message.lat && message.lng) && (
                  <MessageStatusIndicator
                    message={message}
                    isOwnMessage={isMyMessage}
                  />
                )}

                {/* Quick reaction button - position based on message alignment */}
                <div
                  className={`absolute -top-10 z-10 invisible group-hover:visible bg-base-200 rounded-full p-0.5 flex items-center shadow-md whitespace-nowrap border border-base-300 ${
                    isMyMessage ? 'right-0' : 'left-0'
                  }`}
                >
                  {quickReactions.map(emoji => (
                    <button
                      key={emoji}
                      className={`p-1 rounded-full text-lg ${userReaction === emoji ? 'bg-primary/20' : 'hover:bg-base-200'}`}
                      onClick={() => handleQuickReaction(message._id, emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                  <button
                    className="hover:bg-base-200 p-1 rounded-full"
                    onClick={() => setShowReactionPicker(message._id)}
                  >
                    <Smile size={18} />
                  </button>

                  {/* Emoji Picker */}
                  {showReactionPicker === message._id && (
                    <div
                      className={`absolute top-full mt-2 z-20 ${isMyMessage ? 'right-0' : 'left-0'}`}
                      ref={emojiPickerRef}
                    >
                      <EmojiPicker
                        onEmojiClick={(emojiData) => handleReaction(message._id, emojiData.emoji)}
                        searchDisabled={false}
                        width={300}
                        height={350}
                        previewConfig={{ showPreview: false }}
                      />
                    </div>
                  )}
                </div>

                {/* Render existing reactions */}
                {renderReactions(message)}
              </div>
            </div>
          );
        })}
          </div>
        ))}
      </div>

      {/* Floating connection status indicator */}
      {renderFloatingConnectionStatus()}

      {/* Media Preview Overlay */}
      {previewMedia && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={closePreview}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              className="absolute top-2 right-2 z-50 bg-black/50 rounded-full p-1 text-white hover:bg-black/70 transition-colors"
              onClick={closePreview}
            >
              <X size={24} />
            </button>

            {previewMedia.type === 'video' ? (
              <video
                src={previewMedia.url}
                controls
                className="max-h-[90vh] max-w-full rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            ) : previewMedia.type === 'document' ? null : (
              <img
                src={previewMedia.url}
                alt="Preview"
                className="max-h-[90vh] max-w-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </div>
      )}

      {/* Message Info Modal */}
      {showInfoModal && selectedMessage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={closeInfoModal}>
          <div className="bg-base-300 rounded-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Message Info</h3>
              <button onClick={closeInfoModal} className="btn btn-sm btn-ghost btn-circle">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-base-200 rounded-lg">
                {selectedMessage.image && renderMediaContent(selectedMessage)}
                {selectedMessage.text && (
                  <div>
                    <p>{selectedMessage.text}</p>
                    {selectedMessage.isEdited && (
                      <span className="text-xs opacity-60 ml-1">(edited)</span>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Sent</span>
                  <span>{formatDetailedTime(selectedMessage.createdAt)}</span>
                </div>

                {selectedMessage.isEdited && (
                  <div className="flex items-center justify-between text-sm">
                    <span>Edited</span>
                    <span>{formatDetailedTime(selectedMessage.editedAt)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span>Delivered</span>
                  <div className="flex items-center gap-1">
                    {selectedMessage.deliveredAt ? (
                      <>
                        <Check size={16} />
                        <span>{formatDetailedTime(selectedMessage.deliveredAt)}</span>
                      </>
                    ) : (
                      <span>Pending</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span>Read</span>
                  <div className="flex items-center gap-1 text-blue-500">
                    {selectedMessage.seenAt ? (
                      <>
                        <div className="relative">
                          <Check size={14} className="absolute" />
                          <Check size={14} className="relative left-[3px]" />
                        </div>
                        <span>{formatDetailedTime(selectedMessage.seenAt)}</span>
                      </>
                    ) : (
                      <span className="text-base-content/70">Not seen yet</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
      </div>
      )}
        {/* Delete Message Modal */}
      {showDeleteModal && selectedMessage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={closeDeleteModal}>
          <div className="bg-base-300 rounded-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-1">Delete message?</h3>
              <p className="text-sm text-base-content/70">
                {canDeleteForEveryone(selectedMessage)
                  ? `You can delete for everyone or just for yourself. (${getDeleteForEveryoneTimeLeft(selectedMessage)})`
                  : "This message can only be deleted for yourself."}
              </p>
            </div>

            <div className="space-y-2">
              {canDeleteForEveryone(selectedMessage) && (
                <button
                  className="btn btn-error w-full justify-start"
                  onClick={() => handleDeleteMessage('everyone')}
                  disabled={isDeletingMessage}
                >
                  {isDeletingMessage ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    <Trash2 size={18} />
                  )}
                  Delete for everyone
                </button>
              )}

              <button
                className="btn btn-error w-full justify-start"
                onClick={() => handleDeleteMessage('me')}
                disabled={isDeletingMessage}
              >
                {isDeletingMessage ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <Trash2 size={18} />
                )}
                Delete for me
              </button>

              <button
                className="btn btn-ghost w-full"
                onClick={closeDeleteModal}
                disabled={isDeletingMessage}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Message Modal */}
      {showEditModal && selectedMessage && (
        <EditMessageModal
          message={selectedMessage}
          onClose={closeEditModal}
        />
      )}

      {/* Forward Message Modal */}
      {showForwardModal && messageToForward && (
        <ForwardMessageModal
          isOpen={showForwardModal}
          onClose={() => {
            setShowForwardModal(false);
            setMessageToForward(null);
          }}
          messageId={messageToForward._id}
        />
      )}

      {/* Right-click Context Menu */}
      {showContextMenu && selectedMessage && (
        <div
          ref={contextMenuRef}
          className="fixed bg-base-200 rounded-lg shadow-lg z-50 overflow-hidden w-40"
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)'
          }}
        >
          <ul className="menu menu-sm p-0">
                {selectedMessage.text && (
                  <li>
                    <button onClick={() => {
                      try {
                        navigator.clipboard.writeText(selectedMessage.text);
                        setShowContextMenu(null);
                        toast.success('Copied');
                      } catch (e) {
                        toast.error('Failed to copy');
                      }
                    }}>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8H10a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2v-6a2 2 0 00-2-2z" /></svg>
                      <span>Copy</span>
                    </button>
                  </li>
                )}
            <li>
              <button onClick={() => handleReplyToMessage(selectedMessage)}>
                <Reply size={14} />
                <span>Reply</span>
              </button>
            </li>

            <li>
              <button onClick={() => handleForwardMessage(selectedMessage)}>
                <Send size={14} />
                <span>Forward</span>
              </button>
            </li>

            <li>
              <button onClick={() => handleMessageInfo(selectedMessage)}>
                <Info size={14} />
                <span>Info</span>
              </button>
            </li>

                {(selectedMessage.image && ['image','video','audio','music','document','gif'].includes(selectedMessage.mediaType)) && (
                  <li>
                    <button onClick={() => downloadFile(selectedMessage.image, selectedMessage.fileName || 'download')}>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10l5 5 5-5M12 15V4" /></svg>
                      <span>Download</span>
                    </button>
                  </li>
                )}

            {selectedMessage.senderId === authUser._id && canEditMessage(selectedMessage) && (
              <li>
                <button onClick={() => handleEditMessage(selectedMessage)}>
                  <Edit size={14} />
                  <span>Edit</span>
                </button>
              </li>
            )}

            {/* Report option - only for messages from other users */}
            {selectedMessage.senderId !== authUser._id && (
              <li>
                <ReportMessageButton
                  messageId={selectedMessage._id}
                  onReport={() => setShowContextMenu(false)}
                  className="w-full justify-start text-warning hover:text-warning"
                />
              </li>
            )}

            <li className="bg-error/10 hover:bg-error/20">
              <button
                onClick={() => openDeleteModal(selectedMessage)}
                className="text-error font-bold flex items-center gap-2"
              >
                <Trash2 size={16} className="flex-shrink-0" />
                <span>Delete Message</span>
              </button>
            </li>
          </ul>
        </div>
      )}

      <MessageInput />
    </div>
  );
};
export default ChatContainer;