// Poll Creation Modal
function PollModal({ open, onClose, onSubmit }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [allowsMultipleAnswers, setAllowsMultipleAnswers] = useState(false);

  const handleOptionChange = (idx, value) => {
    setOptions(opts => opts.map((opt, i) => (i === idx ? value : opt)));
  };
  const addOption = () => setOptions(opts => [...opts, '']);
  const removeOption = idx => setOptions(opts => opts.length > 2 ? opts.filter((_, i) => i !== idx) : opts);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim() || options.some(opt => !opt.trim()) || options.length < 2) return;
    onSubmit({ question, options: options.map(o => o.trim()), isAnonymous, allowsMultipleAnswers });
    setQuestion(''); setOptions(['', '']); setIsAnonymous(false); setAllowsMultipleAnswers(false);
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form className="bg-base-100 rounded-lg p-6 w-full max-w-md shadow-xl" onSubmit={handleSubmit}>
        <h2 className="text-lg font-bold mb-4">Create Poll</h2>
        <input className="input input-bordered w-full mb-3" placeholder="Question" value={question} onChange={e => setQuestion(e.target.value)} maxLength={200} required />
        <div className="space-y-2 mb-3">
          {options.map((opt, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input className="input input-bordered flex-1" placeholder={`Option ${idx+1}`} value={opt} onChange={e => handleOptionChange(idx, e.target.value)} maxLength={100} required />
              {options.length > 2 && <button type="button" className="btn btn-xs btn-error" onClick={() => removeOption(idx)}>-</button>}
            </div>
          ))}
          {options.length < 10 && <button type="button" className="btn btn-sm btn-outline mt-2" onClick={addOption}>Add Option</button>}
        </div>
        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} />Anonymous</label>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={allowsMultipleAnswers} onChange={e => setAllowsMultipleAnswers(e.target.checked)} />Multiple answers</label>
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!question.trim() || options.some(opt => !opt.trim()) || options.length < 2}>Send</button>
        </div>
      </form>
    </div>
  );
}

// Event Creation Modal
function EventModal({ open, onClose, onSubmit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !eventDate) return;
    onSubmit({ title, description, eventDate, location });
    setTitle(''); setDescription(''); setEventDate(''); setLocation('');
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form className="bg-base-100 rounded-lg p-6 w-full max-w-md shadow-xl" onSubmit={handleSubmit}>
        <h2 className="text-lg font-bold mb-4">Create Event</h2>
        <input className="input input-bordered w-full mb-3" placeholder="Event Title" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} required />
        <textarea className="textarea textarea-bordered w-full mb-3" placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} maxLength={300} />
        <input className="input input-bordered w-full mb-3" type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)} required />
        <input className="input input-bordered w-full mb-4" placeholder="Location (optional)" value={location} onChange={e => setLocation(e.target.value)} maxLength={100} />
        <div className="flex gap-2 justify-end">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!title.trim() || !eventDate}>Send</button>
        </div>
      </form>
    </div>
  );
}
import { useRef, useState, useEffect } from "react";
import ImageEditor from "./ImageEditor";
import VideoTrimmer from "./VideoTrimmer";
import MediaPreviewModal from "./MediaPreviewModal";
import CustomLinkPreview from "./CustomLinkPreview";
import { useChatStore } from "../store/useChatStore";
import { useGroupStore } from "../store/useGroupStore";
import { useAuthStore } from "../store/useAuthStore";
import { 
  Image, Send, X, Smile, Gift, Search, Paperclip, Camera, AtSign,
  FileText, Video, File, Music, Volume2, Hash, Calendar, MapPin
} from "lucide-react";
import LocationPicker from "./LocationPicker";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import toast from "react-hot-toast";
import EmojiPicker from "emoji-picker-react";
import { GiphyFetch } from "@giphy/js-fetch-api";
import { Carousel, Grid } from "@giphy/react-components";
import axios from "axios";
import { axiosInstance } from "../lib/axios";
import ReplyPreview from "./ReplyPreview";
// Encryption imports removed - encryption disabled

// Initialize Giphy with a public API key (in a real app, store this in an env variable)
const gf = new GiphyFetch("sXpGFDGZs0Dv1mmNFvYaGUvYwKX0PWIh");

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const MessageInput = () => {
  // Poll/Event modal state
  const [showPollModal, setShowPollModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);

  // Poll creation handler
  const handleCreatePoll = async (pollData) => {
    try {
    if (!isGroupChat || !selectedGroup?._id) throw new Error('Polls are only available in groups');
    const res = await axiosInstance.post("/poll", { ...pollData, groupId: selectedGroup._id });
      toast.success("Poll created!");
      setShowPollModal(false);
      setShowCreatePoll(false);
    } catch (err) {
    toast.error(err?.response?.data?.error || "Failed to create poll");
    }
  };
  // Event creation handler
  const handleCreateEvent = async (eventData) => {
    try {
    if (!isGroupChat || !selectedGroup?._id) throw new Error('Events are only available in groups');
    const res = await axiosInstance.post("/event", { ...eventData, groupId: selectedGroup._id });
      toast.success("Event created!");
      setShowEventModal(false);
      setShowCreateEvent(false);
    } catch (err) {
    toast.error(err?.response?.data?.error || "Failed to create event");
    }
  };
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [imageToEdit, setImageToEdit] = useState(null);
  const [showVideoTrimmer, setShowVideoTrimmer] = useState(false);
  const [videoToTrim, setVideoToTrim] = useState(null);
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const [mediaPreviewData, setMediaPreviewData] = useState(null); // {type, url, file, fileName, fileSize}
  const [gifUrl, setGifUrl] = useState(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [activeTab, setActiveTab] = useState("emoji"); // 'emoji' | 'gif' | 'sticker'
  const [gifSearchTerm, setGifSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [caption, setCaption] = useState("");
  // For link preview in input
  const [inputUrl, setInputUrl] = useState(null);
  const [showCaption, setShowCaption] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Video trimming state
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationToSend, setLocationToSend] = useState(null);
  const [showVideoEditor, setShowVideoEditor] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoStartTime, setVideoStartTime] = useState(0);
  const [videoEndTime, setVideoEndTime] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Temporary flag to disable mentions for debugging
  const MENTIONS_ENABLED = true;
  const [cursorPosition, setCursorPosition] = useState(0);

  const imageInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const musicInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const videoRef = useRef(null);
  const videoEditorRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaPickerRef = useRef(null);
  const attachmentOptionsRef = useRef(null);
  const textInputRef = useRef(null);
  const mentionSuggestionsRef = useRef(null);

  const { sendMessage, selectedUser, replyingTo, replyToMessage, clearReplyingTo, addUploadingMessage, updateUploadingMessage } = useChatStore();
  const { sendGroupMessage, selectedGroup, replyToGroupMessage, addGroupUploadingMessage, updateGroupUploadingMessage } = useGroupStore();
  const { authUser } = useAuthStore();

  // Determine if we're in group or direct chat mode
  const isGroupChat = !!selectedGroup;

  // Encryption disabled - no need to set currentUserId

  // Watch text input for URLs
  useEffect(() => {
    const urlRegex = /https?:\/\/[\w.-]+(?:\.[\w\.-]+)+(?:[\w\-\._~:/?#[\]@!$&'()*+,;=]*)?/gi;
    const urls = text.match(urlRegex);
    setInputUrl(urls && urls.length > 0 ? urls[0] : null);
  }, [text]);

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_FILE_SIZE) {
      toast.error(
        <div>
          <h3 className="font-bold">File too large</h3>
          <p>Files must be less than 100MB due to Cloudinary's free tier limits.</p>
          <p className="text-sm mt-1">Your file: {(file.size / (1024 * 1024)).toFixed(2)}MB</p>
        </div>,
        { duration: 5000 }
      );
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
      if (documentInputRef.current) documentInputRef.current.value = "";
      if (musicInputRef.current) musicInputRef.current.value = "";
      return;
    }

    // Clear GIF if another file is selected
    setGifUrl(null);

    let detectedMediaType = 'document';
    if (file.type.startsWith('image/')) detectedMediaType = 'image';
    else if (file.type.startsWith('video/')) detectedMediaType = 'video';
    else if (file.type.startsWith('audio/')) detectedMediaType = 'music';

    const objectUrl = URL.createObjectURL(file);

    if (detectedMediaType === 'image' || detectedMediaType === 'video') {
      setMediaPreviewData({
        type: detectedMediaType,
        url: objectUrl,
        file,
        fileName: file.name,
        fileSize: file.size
      });
      setShowMediaPreview(true);
      setShowAttachmentOptions(false);
      return;
    }

    // For other types, set preview directly
    setImagePreview({
      url: objectUrl,
      type: detectedMediaType,
      file,
      fileName: file.name,
      fileSize: file.size
    });
    if (detectedMediaType === 'music' || detectedMediaType === 'audio') {
      setShowCaption(true);
    }
    setShowAttachmentOptions(false);
  };
  // Handle media preview modal actions
  const handleMediaPreviewEdit = () => {
    if (!mediaPreviewData) return;
    if (mediaPreviewData.type === 'image') {
      setImageToEdit(mediaPreviewData);
      setShowImageEditor(true);
    } else if (mediaPreviewData.type === 'video') {
      setVideoToTrim(mediaPreviewData);
      setShowVideoTrimmer(true);
    }
    setShowMediaPreview(false);
  };
  const handleMediaPreviewSend = () => {
    if (!mediaPreviewData) return;
    setImagePreview({
      url: mediaPreviewData.url,
      type: mediaPreviewData.type,
      file: mediaPreviewData.file,
      fileName: mediaPreviewData.fileName,
      fileSize: mediaPreviewData.fileSize
    });
    setShowCaption(true);
    setShowMediaPreview(false);
  };
  const handleMediaPreviewCancel = () => {
    setShowMediaPreview(false);
    setMediaPreviewData(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };
  // Handle image editor save (now receives blob, file, url)
  const handleImageEditSave = async (blob, file, url) => {
    setImagePreview({
      url,
      type: 'image',
      file: file,
      fileName: file.name,
      fileSize: file.size
    });
    setShowImageEditor(false);
    setImageToEdit(null);
    setShowCaption(true);
  };

  // Handle video trimmer save (for demo, just set trimmed times, real trimming would require ffmpeg)
  const handleVideoTrimSave = ({ start, end }) => {
    setImagePreview({
      url: videoToTrim.url,
      type: 'video',
      file: videoToTrim.file,
      fileName: videoToTrim.fileName,
      fileSize: videoToTrim.fileSize,
      trimStart: start,
      trimEnd: end,
      trimDuration: end - start
    });
    setShowVideoTrimmer(false);
    setVideoToTrim(null);
    setShowCaption(true);
  };

  const handleImageEditCancel = () => {
    setShowImageEditor(false);
    setImageToEdit(null);
  };
  const handleVideoTrimCancel = () => {
    setShowVideoTrimmer(false);
    setVideoToTrim(null);
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame on canvas
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to data URL
    const photoData = canvas.toDataURL('image/jpeg');
    setCapturedPhoto(photoData);
  };

  // When user clicks Use Photo, open image editor/preview modal instead of sending directly
  const usePhoto = () => {
    setImageToEdit({
      url: capturedPhoto,
      file: null,
      fileName: 'camera-photo.jpg',
      fileSize: null
    });
    setShowImageEditor(true);
    setShowCameraModal(false);
    setCapturedPhoto(null);
  };

  // When user clicks Retake, clear photo and keep camera open
  const retakePhoto = () => {
    setCapturedPhoto(null);
    // Camera modal stays open, so user can take another photo
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCapturedPhoto(null);
    setShowCameraModal(false);
  };

  // Open device camera
  const openCamera = async () => {
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        toast.error('Camera not supported in this browser');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setCameraStream(stream);
      setShowCameraModal(true);
      setShowAttachmentOptions(false);
    } catch (err) {
      console.error('Failed to access camera:', err);
      toast.error('Unable to access camera. Please check permissions.');
    }
  };

  const removePreview = () => {
    setImagePreview(null);
  if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const removeGif = () => {
    setGifUrl(null);
  };

  // Handle music file upload
  const handleMusicUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      // Process file upload
      await handleFileUpload(file, 'music');
    } catch (error) {
      console.error('Error uploading music file:', error);
      toast.error('Failed to upload music file');
    }
  };

  // Handle text input changes and mention detection
  const handleTextChange = (e) => {
    const value = e.target.value;
    const position = e.target.selectionStart;

    setText(value);
    setCursorPosition(position);

    // Check for mentions in group chats (with safety checks)
    if (MENTIONS_ENABLED && isGroupChat && selectedGroup?.members && Array.isArray(selectedGroup.members)) {
      try {
        const textBeforeCursor = value.substring(0, position);
        const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

        if (mentionMatch && mentionMatch[1] !== undefined) {
          setMentionQuery(mentionMatch[1]);
          setShowMentionSuggestions(true);
          setSelectedMentionIndex(0); // Reset selection
        } else {
          setShowMentionSuggestions(false);
          setMentionQuery("");
          setSelectedMentionIndex(0);
        }
      } catch (error) {
        console.error("Error in mention detection:", error);
        setShowMentionSuggestions(false);
        setMentionQuery("");
      }
    } else {
      // Ensure mentions are hidden if not in group chat
      setShowMentionSuggestions(false);
      setMentionQuery("");
    }
  };

  // Handle mention selection
  const handleMentionSelect = (member) => {
    const textBeforeCursor = text.substring(0, cursorPosition);
    const textAfterCursor = text.substring(cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const beforeMention = textBeforeCursor.substring(0, mentionMatch.index);
      const newText = beforeMention + `@${member.user.username} ` + textAfterCursor;
      setText(newText);

      // Set cursor position after the mention
      setTimeout(() => {
        const newPosition = beforeMention.length + member.user.username.length + 2;
        if (textInputRef.current) {
          textInputRef.current.setSelectionRange(newPosition, newPosition);
          textInputRef.current.focus();
        }
      }, 0);
    }

    setShowMentionSuggestions(false);
    setMentionQuery("");
    setSelectedMentionIndex(0);
  };

  // Get already mentioned usernames from current message text
  const getAlreadyMentioned = () => {
    const mentionRegex = /@(\w+)/g;
    const mentioned = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentioned.push(match[1].toLowerCase());
    }

    return mentioned;
  };

  // Get filtered group members for mentions
  const getMentionSuggestions = () => {
    try {
      // Basic validation
      if (!isGroupChat || !selectedGroup?.members || !Array.isArray(selectedGroup.members)) {
        return [];
      }

      const currentUserUsername = authUser?.username?.toLowerCase();
      const query = mentionQuery.toLowerCase().trim();

      return selectedGroup.members
        .filter(member => {
          // Must have valid user data
          if (!member?.user?.username || !member?.user?.fullName) {
            return false;
          }

          const memberUsername = member.user.username.toLowerCase();
          const memberFullName = member.user.fullName.toLowerCase();

          // Exclude current user (prevent self-tagging)
          if (memberUsername === currentUserUsername) {
            return false;
          }

          // Filter by search query if provided
          if (query) {
            return memberUsername.includes(query) || memberFullName.includes(query);
          }

          return true;
        })
        .slice(0, 8); // Show up to 8 suggestions
    } catch (error) {
      console.error("Error in getMentionSuggestions:", error);
      return [];
    }
  };

  // Extract mentions from text
  const extractMentions = (messageText) => {
    if (!isGroupChat || !selectedGroup?.members) return [];

    const mentions = [];
    const mentionRegex = /@(\w+)/g;
    let match;

    while ((match = mentionRegex.exec(messageText)) !== null) {
      const username = match[1];
      const offset = match.index;
      const length = match[0].length;

      // Find the user in group members
      const member = selectedGroup.members.find(m =>
        m.user.username === username ||
        m.user.fullName.toLowerCase().replace(/\s+/g, '') === username.toLowerCase()
      );

      if (member) {
        mentions.push({
          user: member.user._id,
          username: member.user.username,
          offset,
          length
        });
      }
    }

    return mentions;
  };


  const handleSendMessage = async (e) => {
    e.preventDefault();
    // Handle sending location message
    if (locationToSend) {
      try {
        const messageData = {
          type: "location",
          lat: locationToSend.lat,
          lng: locationToSend.lng,
          address: locationToSend.address,
        };
        if (isGroupChat) {
          await sendGroupMessage(selectedGroup._id, messageData);
        } else {
          await sendMessage(messageData);
        }
        setLocationToSend(null);
      } catch (error) {
        toast.error("Failed to send location");
      }
      return;
    }
    if (!text.trim() && !imagePreview && !gifUrl) return;

    try {
      let messageText = text.trim();
      let isEncrypted = false;

      // Encryption disabled - send messages as plain text
      console.log('📝 Sending message as plain text (encryption disabled)');
      // messageText remains unchanged (plain text)
      isEncrypted = false;

      // Extract mentions for group messages
      const mentions = isGroupChat ? extractMentions(messageText) : [];
      console.log('🏷️ Extracted mentions:', mentions);

      // Double-check video mediaType before sending
      let mediaType = null;
      
      if (imagePreview) {
        mediaType = imagePreview.type;
        
        // Force correct mediaType for videos if URL has video extension
        const url = imagePreview.url;
        if (url) {
          const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v'];
          const isVideoByExtension = videoExtensions.some(ext => url.toLowerCase().includes(ext));
          
          if (isVideoByExtension && mediaType !== 'video') {
            console.log('🎥 URL contains video extension, forcing mediaType to video');
            mediaType = 'video';
          }
        }
      } else if (gifUrl) {
        mediaType = 'gif';
      }
      
      console.log('📨 Sending message with mediaType:', mediaType, imagePreview?.fileName);

      const messageDataBase = {
        text: messageText,
        image: gifUrl || null,
        mediaType: mediaType,
        fileName: imagePreview?.fileName || null,
        fileSize: imagePreview?.fileSize || null,
        caption: caption.trim() || null,
        isEncrypted: isEncrypted,
        mentions: mentions
      };

      // If we have a local file selected (any media), upload now and show sending bubble with progress
      if (imagePreview && imagePreview.file) {
        try {
          const file = imagePreview.file;
          // Prepare temp uploading bubble
          const baseData = {
            text: messageText,
            image: null,
            mediaType: mediaType,
            fileName: imagePreview.fileName,
            fileSize: imagePreview.fileSize,
            caption: caption.trim() || null
          };
          let tempId;
          if (isGroupChat) tempId = addGroupUploadingMessage(selectedGroup._id, baseData);
          else tempId = addUploadingMessage(baseData);

          setIsUploading(true);
          setUploadProgress(0);

          // Upload
          const formData = new FormData();
          formData.append('file', file);

          const resp = await axios.post('/api/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            withCredentials: true,
            timeout: 300000,
            onUploadProgress: (progressEvent) => {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percentCompleted);
              if (isGroupChat) updateGroupUploadingMessage(tempId, { uploadProgress: percentCompleted });
              else updateUploadingMessage(tempId, { uploadProgress: percentCompleted });
            }
          });

          const { url, mediaType: serverMediaType, fileName, fileSize } = resp.data;
          const finalType = serverMediaType || mediaType;

          const sendPayload = {
            tempId,
            text: messageText,
            image: url,
            mediaType: finalType,
            fileName: fileName || imagePreview.fileName,
            fileSize: fileSize || imagePreview.fileSize,
            caption: caption.trim() || null,
            isEncrypted: isEncrypted,
            mentions
          };

          if (replyingTo) {
            // For replies, use reply APIs directly
            if (isGroupChat) {
              await replyToGroupMessage(
                replyingTo._id,
                sendPayload.text,
                sendPayload.image,
                sendPayload.mediaType,
                sendPayload.fileName,
                sendPayload.fileSize,
                sendPayload.caption
              );
            } else {
              await replyToMessage(
                replyingTo._id,
                sendPayload.text,
                sendPayload.image,
                sendPayload.mediaType,
                sendPayload.fileName,
                sendPayload.fileSize,
                sendPayload.caption
              );
            }
          } else if (isGroupChat) {
            await sendGroupMessage(selectedGroup._id, sendPayload);
          } else {
            await sendMessage(sendPayload);
          }

          // Clear state
          setText("");
          setImagePreview(null);
          setGifUrl(null);
          setShowMentionSuggestions(false);
          setMentionQuery("");
          setCaption("");
          setShowCaption(false);
          clearReplyingTo();
          if (imageInputRef.current) imageInputRef.current.value = "";
          if (documentInputRef.current) documentInputRef.current.value = "";
          if (musicInputRef.current) musicInputRef.current.value = "";
          if (videoInputRef.current) videoInputRef.current.value = "";
          if (videoRef.current) videoRef.current.srcObject = null;
          setIsUploading(false);
          return;
        } catch (error) {
          console.error('Upload on send failed:', error);
          toast.error('Failed to upload. Please try again.');
          setIsUploading(false);
          return;
        }
      }


      // No local file: send as before (text or gif or already-hosted url)
      const messageData = messageDataBase;

      // Handle reply vs regular message
      if (replyingTo) {
        if (isGroupChat) {
          await replyToGroupMessage(
            replyingTo._id,
            messageData.text,
            messageData.image,
            messageData.mediaType,
            messageData.fileName,
            messageData.fileSize,
            messageData.caption
          );
        } else {
          await replyToMessage(
            replyingTo._id,
            messageData.text,
            messageData.image,
            messageData.mediaType,
            messageData.fileName,
            messageData.fileSize,
            messageData.caption
          );
        }
      } else {
        if (isGroupChat) {
          await sendGroupMessage(selectedGroup._id, messageData);
        } else {
          await sendMessage(messageData);
        }
      }

      // Clear form
      setText("");
      setImagePreview(null);
      setGifUrl(null);
      setShowMentionSuggestions(false);
      setMentionQuery("");
      setCaption("");
      setShowCaption(false);
      clearReplyingTo();
      
  // Reset file inputs
  if (imageInputRef.current) imageInputRef.current.value = "";
      if (documentInputRef.current) documentInputRef.current.value = "";
      if (musicInputRef.current) musicInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
      if (videoRef.current) videoRef.current.srcObject = null;
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleEmojiClick = (emojiData) => {
    setText((prevText) => prevText + emojiData.emoji);
  };

  const handleGifSelect = (gif) => {
    // Clear image if a GIF is selected
    setImagePreview(null);
  if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoRef.current) videoRef.current.srcObject = null;

    // Get the GIF URL
    const gifUrl = gif.images.original.url;
    setGifUrl(gifUrl);
    setShowMediaPicker(false);
  };

  const handleGifSearch = (search) => {
    setGifSearchTerm(search);
    setIsSearching(!!search);
  };

  // Close media picker, attachment options, and mention suggestions when clicking outside
  const handleClickOutside = (e) => {
    // Check if the click is on the text input (don't close mentions if typing)
    if (textInputRef.current && textInputRef.current.contains(e.target)) {
      return;
    }

    if (mediaPickerRef.current && !mediaPickerRef.current.contains(e.target)) {
      setShowMediaPicker(false);
    }
    if (attachmentOptionsRef.current && !attachmentOptionsRef.current.contains(e.target)) {
      setShowAttachmentOptions(false);
    }
    if (mentionSuggestionsRef.current && !mentionSuggestionsRef.current.contains(e.target)) {
      setShowMentionSuggestions(false);
      setMentionQuery("");
    }
  };

  // Add event listener when pickers are shown
  useEffect(() => {
    if (showMediaPicker || showAttachmentOptions || showMentionSuggestions) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMediaPicker, showAttachmentOptions, showMentionSuggestions]);

  // Setup video stream when camera modal is opened
  useEffect(() => {
    if (showCameraModal && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [showCameraModal, cameraStream]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'emoji':
        return (
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            searchDisabled={false}
            width={300}
            height={350}
            previewConfig={{ showPreview: false }}
          />
        );
      case 'gif':
        return (
          <div className="p-2 h-[350px]">
            {/* GIF Search Bar */}
            <div className="relative mb-3">
              <input
                type="text"
                className="w-full input input-bordered input-sm pl-8"
                placeholder="Search GIFs..."
                value={gifSearchTerm}
                onChange={(e) => handleGifSearch(e.target.value)}
              />
              <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-zinc-400" />
            </div>

            {/* Display searched GIFs or trending GIFs */}
            <div className="gif-container overflow-y-auto h-[calc(100%-40px)]">
              {isSearching ? (
                <Grid
                  width={300}
                  columns={2}
                  fetchGifs={(offset) => gf.search(gifSearchTerm, { offset, limit: 10 })}
                  key={gifSearchTerm}
                  onGifClick={handleGifSelect}
                  noLink={true}
                  hideAttribution={true}
                />
              ) : (
                <Carousel
                  gifHeight={150}
                  gutter={6}
                  fetchGifs={(offset) => gf.trending({ offset, limit: 10 })}
                  key="trending"
                  onGifClick={handleGifSelect}
                  noLink={true}
                  hideAttribution={true}
                />
              )}
            </div>
          </div>
        );
      case 'sticker':
        return (
          <div className="p-2 h-[350px]">
            <div className="relative mb-3">
              <input
                type="text"
                className="w-full input input-bordered input-sm pl-8"
                placeholder="Search Stickers..."
                value={gifSearchTerm}
                onChange={(e) => handleGifSearch(e.target.value)}
              />
              <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-zinc-400" />
            </div>
            <div className="gif-container overflow-y-auto h-[calc(100%-40px)]">
              {isSearching ? (
                <Grid
                  width={300}
                  columns={2}
                  fetchGifs={(offset) => gf.search(gifSearchTerm, { offset, limit: 10, type: 'stickers' })}
                  key={`stickers-${gifSearchTerm}`}
                  onGifClick={handleGifSelect}
                  noLink={true}
                  hideAttribution={true}
                />
              ) : (
                <Carousel
                  gifHeight={150}
                  gutter={6}
                  fetchGifs={(offset) => gf.trending({ offset, limit: 10, type: 'stickers' })}
                  key="stickers-trending"
                  onGifClick={handleGifSelect}
                  noLink={true}
                  hideAttribution={true}
                />
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-2 w-full">
      {/* Reply Preview */}
      <ReplyPreview />

      {/* Media Preview */}
      {/* Upload progress indicator */}
      {isUploading && (
        <div className="mb-3 w-full">
          <div className="flex items-center gap-2">
            <div className="w-full h-2 bg-base-300 rounded-full overflow-hidden">
              <div 
                className="h-full bg-tangerine rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-xs whitespace-nowrap">{uploadProgress}%</span>
          </div>
          <p className="text-xs text-base-content/70 mt-1">
            Uploading file... Please wait
          </p>
        </div>
      )}
      

      {/* WhatsApp-like Media Preview Modal */}
      {showMediaPreview && mediaPreviewData && (
        <MediaPreviewModal
          type={mediaPreviewData.type}
          src={mediaPreviewData.url}
          fileName={mediaPreviewData.fileName}
          onEdit={handleMediaPreviewEdit}
          onSend={handleMediaPreviewSend}
          onCancel={handleMediaPreviewCancel}
        />
      )}

      {/* Image/Video Editor Modals */}
      {showImageEditor && imageToEdit && (
        <ImageEditor
          imageSrc={imageToEdit.url}
          onSave={handleImageEditSave}
          onCancel={() => {
            setShowImageEditor(false);
            setImageToEdit(null);
            setShowMediaPreview(true);
          }}
        />
      )}
      {showVideoTrimmer && videoToTrim && (
        <VideoTrimmer
          videoSrc={videoToTrim.url}
          onTrim={handleVideoTrimSave}
          onCancel={() => {
            setShowVideoTrimmer(false);
            setVideoToTrim(null);
            setShowMediaPreview(true);
          }}
        />
      )}

      {imagePreview && (
        <div className="mb-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              {/* Show upload progress overlay if uploading */}
              {isUploading && (
                <div className="absolute inset-0 bg-black/70 z-10 flex flex-col items-center justify-center rounded-lg">
                  <div className="w-full px-4">
                    <div className="mb-1 flex justify-between items-center">
                      <span className="text-white text-xs font-medium">{uploadProgress}%</span>
                      <span className="text-white text-xs">{formatFileSize(imagePreview.fileSize)}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div className="bg-tangerine h-1.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              {imagePreview.type === 'image' && (
                <img
                  src={imagePreview.url}
                  alt="Preview"
                  className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
                />
              )}
              {imagePreview.type === 'video' && (
                <div className="w-48 h-32 flex flex-col items-center justify-center bg-base-200 rounded-lg border border-zinc-700 relative">
                  <video
                    ref={videoPreviewRef}
                    src={imagePreview.url}
                    controls
                    className="w-full h-full object-cover rounded-lg"
                    onLoadedMetadata={(e) => {
                      const duration = Math.floor(e.target.duration);
                      setVideoDuration(duration);
                      setVideoEndTime(duration);
                    }}
                  />
                  
                  {/* Video info overlay */}
                  <div className="absolute top-0 left-0 right-0 bg-black/50 px-2 py-0.5 flex justify-between items-center text-xs text-white">
                    <span>{imagePreview.trimDuration ? 
                      `${imagePreview.trimDuration.toFixed(1)}s (trimmed)` : 
                      videoDuration ? `${videoDuration.toFixed(1)}s` : 'Loading...'}
                    </span>
                    {imagePreview.fileSize && <span>{formatFileSize(imagePreview.fileSize)}</span>}
                  </div>
                  
                  {/* Toolbar for video preview */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 flex justify-between items-center">
                    <button
                      className="text-white hover:text-tangerine p-1 rounded"
                      title="Trim video"
                      type="button"
                      onClick={() => setShowVideoEditor(true)}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    
                    <button
                      className="text-white hover:text-tangerine p-1 rounded"
                      title="Download video"
                      type="button"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = imagePreview.url;
                        link.download = imagePreview.fileName || 'video';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
              {imagePreview.type === 'document' && (
                <div className="w-20 h-20 flex flex-col items-center justify-center bg-base-200 rounded-lg border border-zinc-700">
                  <FileText className="size-6 mb-1" />
                  <span className="text-xs truncate max-w-16">
                    {imagePreview.fileName?.split('.').pop() || 'DOC'}
                  </span>
                </div>
              )}
              {imagePreview.type === 'audio' && (
                <div className="w-20 h-20 flex flex-col items-center justify-center bg-base-200 rounded-lg border border-zinc-700">
                  <Volume2 className="size-6 mb-1" />
                  <span className="text-xs">Audio</span>
                </div>
              )}
              <button
                onClick={removePreview}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
                flex items-center justify-center"
                type="button"
                disabled={isUploading}
              >
                <X className="size-3" />
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden">
              {imagePreview.fileName && (
                <div className="text-sm font-medium truncate">
                  {imagePreview.fileName}
                </div>
              )}
              {imagePreview.fileSize && (
                <div className="text-xs text-base-content/70">
                  {Math.round(imagePreview.fileSize / 1024)} KB
                </div>
              )}
            </div>
          </div>
          
          {/* Caption input */}
          {showCaption && (
            <div className="w-full">
              <input
                type="text"
                className="w-full input input-bordered input-sm text-sm"
                placeholder="Add a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>
          )}
        </div>
      )}

      {gifUrl && (
        <div className="mb-3 flex items-center gap-2">
          <div className="relative">
            <img
              src={gifUrl}
              alt="GIF Preview"
              className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
            />
            <button
              onClick={removeGif}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
              type="button"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        {/* Media Picker */}
        {showMediaPicker && (
          <div
            className="absolute bottom-16 left-0 z-10 bg-base-300 rounded-lg shadow-lg"
            ref={mediaPickerRef}
          >
            {/* Tabbed Navigation */}
            <div className="flex border-b border-base-200">
              <button
                className={`flex-1 p-2 ${activeTab === 'emoji' ? 'bg-base-200' : ''}`}
                onClick={() => setActiveTab('emoji')}
              >
                <Smile size={20} className="mx-auto" />
              </button>
              <button
                className={`flex-1 p-2 ${activeTab === 'gif' ? 'bg-base-200' : ''}`}
                onClick={() => setActiveTab('gif')}
              >
                <Gift size={20} className="mx-auto" />
              </button>
              <button
                className={`flex-1 p-2 ${activeTab === 'sticker' ? 'bg-base-200' : ''}`}
                onClick={() => setActiveTab('sticker')}
              >
                <span className="mx-auto text-xs">Sticker</span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="w-[300px]">
              {renderTabContent()}
          </div>
        </div>
      )}

      {/* Location Picker Modal (always outside the form) */}
      {showLocationPicker && (
        <LocationPicker
          onSelect={(pos) => {
            setShowLocationPicker(false);
            setLocationToSend(pos);
          }}
          onCancel={() => setShowLocationPicker(false)}
        />
      )}

      {/* Location map preview before sending (outside the form) */}
      {locationToSend && (
        <div className="mb-3 flex flex-col gap-2 bg-base-200 rounded-lg p-3 border border-base-300">
          <div className="font-semibold mb-1">Location Preview</div>
          <div style={{ height: 180, width: "100%" }}>
            <MapContainer center={[locationToSend.lat, locationToSend.lng]} zoom={15} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false} dragging={false} doubleClickZoom={false} zoomControl={false} attributionControl={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[locationToSend.lat, locationToSend.lng]} />
            </MapContainer>
          </div>
          <div className="text-sm text-gray-700 mt-2">
            <span className="font-medium">{locationToSend.address || "Location"}</span>
          </div>
          <div className="flex gap-2 mt-2">
            <button className="btn btn-ghost btn-sm" onClick={() => setLocationToSend(null)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleSendMessage}>Send Location</button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-base-100 p-2 rounded-lg shadow-message border-none mt-2 mx-2">
          <div className="flex items-center gap-1">
            {/* Emoji/GIF button */}
            <button
              type="button"
              className="text-neutral hover:text-base-content transition-colors p-2 rounded-full hover:bg-base-200"
              onClick={() => setShowMediaPicker(!showMediaPicker)}
            >
              <Smile size={20} />
            </button>

            {/* Attachment button */}
            <button
              type="button"
              className="text-neutral hover:text-base-content transition-colors p-2 rounded-full hover:bg-base-200"
              onClick={() => {
                setShowAttachmentOptions(!showAttachmentOptions);
                setShowMediaPicker(false);
              }}
            >
              <Paperclip size={20} />
            </button>
          </div>

          <div className="flex-1 relative">
            <textarea
              ref={textInputRef}
              className="w-full py-2 px-3 rounded-3xl bg-base-200 text-base-content border-0 focus:outline-none resize-none min-h-[40px] max-h-40"
              placeholder={isGroupChat ? "Type a message... (use @ to mention members)" : "Type a message..."}
              value={text}
              onChange={e => {
                handleTextChange(e);
                // Auto-resize textarea
                const ta = e.target;
                ta.style.height = 'auto';
                ta.style.height = Math.min(ta.scrollHeight, 320) + 'px'; // max 8 lines (40px * 8)
              }}
              onPaste={async (e) => {
                if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
                  const file = e.clipboardData.files[0];
                  if (file.type.startsWith('image/')) {
                    e.preventDefault();
                    // Use your existing handleFileChange logic for images
                    const dataTransfer = { target: { files: [file] } };
                    handleFileChange(dataTransfer, 'image');
                  }
                }
              }}
              onKeyDown={(e) => {
                // Handle mention navigation
                if (showMentionSuggestions) {
                  const suggestions = getMentionSuggestions();

                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedMentionIndex(prev =>
                      prev < suggestions.length - 1 ? prev + 1 : 0
                    );
                    return;
                  }

                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedMentionIndex(prev =>
                      prev > 0 ? prev - 1 : suggestions.length - 1
                    );
                    return;
                  }

                  if (e.key === 'Enter' && suggestions[selectedMentionIndex]) {
                    e.preventDefault();
                    handleMentionSelect(suggestions[selectedMentionIndex]);
                    return;
                  }

                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setShowMentionSuggestions(false);
                    setMentionQuery("");
                    setSelectedMentionIndex(0);
                    return;
                  }
                }

                // Normal enter handling
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
                // Shift+Enter inserts newline (default behavior)
              }}
              style={{overflow: 'hidden'}}
              rows={1}
            />

            {/* Mention suggestions */}
            {MENTIONS_ENABLED && showMentionSuggestions && isGroupChat && (
              <div
                ref={mentionSuggestionsRef}
                className="absolute bottom-full left-0 mb-2 bg-base-100 rounded-lg shadow-xl border border-base-300 w-full max-w-sm"
                style={{
                  zIndex: 1000,
                  position: 'absolute',
                  transform: 'translateY(-8px)'
                }}
              >
                {(() => {
                  const suggestions = getMentionSuggestions();

                  if (suggestions.length > 0) {
                    return (
                      <div className="max-h-64 overflow-hidden">
                        {/* Header */}
                        <div className="px-3 py-2 border-b border-base-300 bg-base-200 rounded-t-lg">
                          <div className="flex items-center gap-2">
                            <AtSign size={14} className="text-primary" />
                            <span className="text-xs font-medium text-base-content">
                              Mention Members ({suggestions.length})
                            </span>
                          </div>
                        </div>

                        {/* Members list */}
                        <div className="max-h-48 overflow-y-auto">
                          {suggestions.map((member, index) => (
                            <button
                              key={member.user._id}
                              type="button"
                              className={`w-full flex items-center gap-3 p-3 text-left transition-colors duration-150 border-b border-base-300 last:border-b-0 ${
                                index === selectedMentionIndex
                                  ? 'bg-primary text-primary-content'
                                  : 'hover:bg-base-200'
                              }`}
                              onClick={() => handleMentionSelect(member)}
                            >
                              <div className="relative">
                                <img
                                  src={member.user.profilePic || "/avatar.png"}
                                  alt={member.user.fullName}
                                  className="w-8 h-8 rounded-full flex-shrink-0 border-2 border-base-300"
                                />
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-base-100"></div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate text-sm text-base-content">
                                  {member.user.fullName}
                                </div>
                                <div className="text-xs text-primary truncate">
                                  @{member.user.username}
                                </div>
                              </div>
                              <div className="text-xs text-base-content/50">
                                Click to mention
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Footer */}
                        <div className="px-3 py-2 bg-base-200 rounded-b-lg border-t border-base-300">
                          <div className="text-xs text-base-content/60 text-center">
                            Type to filter • ESC to close
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Show different messages based on the situation
                  if (!selectedGroup?.members || selectedGroup.members.length <= 1) {
                    return (
                      <div className="p-4 text-center">
                        <AtSign size={24} className="mx-auto text-base-content/30 mb-2" />
                        <div className="text-sm text-base-content/60">
                          Add more members to use @ mentions
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="p-4 text-center">
                      <AtSign size={24} className="mx-auto text-base-content/30 mb-2" />
                      <div className="text-sm text-base-content/60">
                        No members match "{mentionQuery}"
                      </div>
                      <div className="text-xs text-base-content/40 mt-1">
                        Try a different search term
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

          {/* file inputs are declared at the bottom */}

            {/* Attachment options */}
            {showAttachmentOptions && (
              <div
                className="absolute bottom-14 left-0 z-10 bg-base-300 rounded-lg p-3 w-[220px]"
                ref={attachmentOptionsRef}
              >
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    className="flex items-center gap-2 hover:bg-base-200 p-2 rounded-md w-full text-left"
                    onClick={() => {
                      setShowAttachmentOptions(false);
                      setTimeout(() => setShowLocationPicker(true), 0);
                    }}
                  >
                    <MapPin size={18} />
                    <span className="text-sm">Share Location</span>
                  </button>
      {/* Location Picker Modal */}
      {showLocationPicker && (
        <LocationPicker
          onSelect={(pos) => {
            setShowLocationPicker(false);
            setLocationToSend(pos);
          }}
          onCancel={() => setShowLocationPicker(false)}
        />
      )}

      {/* Location map preview before sending */}
      {locationToSend && (
        <div className="mb-3 flex flex-col gap-2 bg-base-200 rounded-lg p-3 border border-base-300">
          <div className="font-semibold mb-1">Location Preview</div>
          <div style={{ height: 180, width: "100%" }}>
            <MapContainer center={[locationToSend.lat, locationToSend.lng]} zoom={15} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false} dragging={false} doubleClickZoom={false} zoomControl={false} attributionControl={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[locationToSend.lat, locationToSend.lng]} />
            </MapContainer>
          </div>
          <div className="text-sm text-gray-700 mt-2">
            <span className="font-medium">{locationToSend.address || "Location"}</span>
          </div>
          <div className="flex gap-2 mt-2">
            <button className="btn btn-ghost btn-sm" onClick={() => setLocationToSend(null)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleSendMessage}>Send Location</button>
          </div>
        </div>
      )}
                  {isGroupChat && (
                    <>
                      <button
                        type="button"
                        className="flex items-center gap-2 hover:bg-base-200 p-2 rounded-md w-full text-left"
                        onClick={() => {
                          setShowAttachmentOptions(false);
                          setShowPollModal(true);
                        }}
                      >
                        <Hash size={18} />
                        <span className="text-sm">Create Poll</span>
                      </button>
                      <button
                        type="button"
                        className="flex items-center gap-2 hover:bg-base-200 p-2 rounded-md w-full text-left"
                        onClick={() => {
                          setShowAttachmentOptions(false);
                          setShowEventModal(true);
                        }}
                      >
                        <Calendar size={18} />
                        <span className="text-sm">Create Event</span>
                      </button>
                      <div className="h-px bg-base-200 my-1" />
                    </>
                  )}
                  <button
                    type="button"
                    className="flex items-center gap-2 hover:bg-base-200 p-2 rounded-md w-full text-left"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <Image size={18} />
                    <span className="text-sm">Image</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 hover:bg-base-200 p-2 rounded-md w-full text-left"
                    onClick={() => videoInputRef.current?.click()}
                  >
                    <Video size={18} />
                    <span className="text-sm">Video</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 hover:bg-base-200 p-2 rounded-md w-full text-left"
                    onClick={() => documentInputRef.current?.click()}
                  >
                    <FileText size={18} />
                    <span className="text-sm">Document</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 hover:bg-base-200 p-2 rounded-md w-full text-left"
                    onClick={openCamera}
                  >
                    <Camera size={18} />
                    <span className="text-sm">Camera</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 hover:bg-base-200 p-2 rounded-md w-full text-left"
                    onClick={() => musicInputRef.current?.click()}
                  >
                    <Music size={18} />
                    <span className="text-sm">Music</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Send button */}
          <div className="flex items-center gap-1">              
            <button
              type="submit"
              className="p-2.5 bg-tangerine text-white rounded-full hover:bg-tangerine/90 transition-colors flex items-center justify-center"
              disabled={(!text.trim() && !imagePreview && !gifUrl) || isUploading}
            >
              {isUploading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                <Send size={20} strokeWidth={2} />
              )}
            </button>
          </div>
        </form>
      </div>
      
      {/* Hidden file inputs */}
      <input
        type="file"
  accept="image/*"
        className="hidden"
  ref={imageInputRef}
        onChange={(e) => handleFileChange(e, 'image')}
      />
      
      <input
        type="file"
        accept="video/*"
        className="hidden"
        ref={videoInputRef}
        onChange={(e) => handleFileChange(e, 'video')}
      />
      
      <input
        type="file"
        accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
        className="hidden"
        ref={documentInputRef}
        onChange={(e) => handleFileChange(e, 'document')}
      />
      
      <input
        type="file"
        accept="audio/*"
        className="hidden"
        ref={musicInputRef}
        onChange={(e) => handleFileChange(e, 'music')}
      />

      {/* Video Editor Modal */}
      {showVideoEditor && imagePreview && imagePreview.type === 'video' && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-base-300 rounded-xl p-4 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Video Editor</h3>
              <button
                type="button"
                onClick={() => setShowVideoEditor(false)}
                className="btn btn-sm btn-ghost btn-circle"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="mb-6">
              <div className="relative bg-black rounded-lg overflow-hidden">
                {/* Video preview with improved loading and trimming indicators */}
                <div className="relative">
                  <video 
                    ref={videoEditorRef}
                    src={imagePreview.url} 
                    className="w-full h-auto max-h-96 object-contain"
                    controls
                    onPlay={() => setIsVideoPlaying(true)}
                    onPause={() => setIsVideoPlaying(false)}
                    onLoadedMetadata={(e) => {
                      // Update duration when video loads
                      setVideoDuration(e.target.duration);
                      setVideoEndTime(e.target.duration);
                    }}
                    onTimeUpdate={(e) => {
                      // If video plays past the end trim point, jump back to start trim point
                      if (e.target.currentTime > videoEndTime) {
                        e.target.currentTime = videoStartTime;
                      }
                    }}
                  ></video>
                  
                  {/* Trim indicators overlay */}
                  {videoDuration > 0 && (
                    <div className="absolute bottom-12 left-0 right-0 h-1 bg-gray-800 mx-2">
                      <div 
                        className="absolute h-full bg-tangerine" 
                        style={{
                          left: `${(videoStartTime / videoDuration) * 100}%`,
                          right: `${100 - (videoEndTime / videoDuration) * 100}%`
                        }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Trimming controls */}
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-1">Trim Video</h4>
                
                <div className="flex items-center gap-3">
                  {/* Start time */}
                  <div className="flex flex-col">
                    <label className="text-xs mb-1">Start</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        min="0"
                        max={videoEndTime}
                        value={videoStartTime}
                        onChange={(e) => {
                          const value = Math.min(Number(e.target.value), videoEndTime - 1);
                          setVideoStartTime(Math.max(0, value));
                          if (videoEditorRef.current) {
                            videoEditorRef.current.currentTime = Math.max(0, value);
                          }
                        }}
                        className="input input-xs input-bordered w-16"
                      />
                      <span className="text-xs self-center">sec</span>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="flex-1 px-2">
                    <input
                      type="range"
                      min="0"
                      max={videoDuration}
                      value={videoStartTime}
                      onChange={(e) => {
                        setVideoStartTime(Number(e.target.value));
                        if (videoEditorRef.current) {
                          videoEditorRef.current.currentTime = Number(e.target.value);
                        }
                      }}
                      className="range range-xs range-primary"
                    />
                  </div>
                  
                  {/* End time */}
                  <div className="flex flex-col">
                    <label className="text-xs mb-1">End</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        min={videoStartTime + 1}
                        max={videoDuration}
                        value={videoEndTime}
                        onChange={(e) => {
                          const value = Math.max(Number(e.target.value), videoStartTime + 1);
                          setVideoEndTime(Math.min(videoDuration, value));
                        }}
                        className="input input-xs input-bordered w-16"
                      />
                      <span className="text-xs self-center">sec</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 flex justify-between">
                  <div className="text-xs">
                    Duration: {(videoEndTime - videoStartTime).toFixed(1)} seconds
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => {
                        setVideoStartTime(0);
                        setVideoEndTime(videoDuration);
                      }}
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        // In a real implementation, you would use FFmpeg.js or WebAssembly 
                        // to trim the video client-side before uploading
                        // For now, we'll simulate by updating the UI
                        if (videoEditorRef.current) {
                          videoEditorRef.current.currentTime = videoStartTime;
                        }
                        
                        // Update the video preview metadata with trim info
                        setImagePreview({
                          ...imagePreview,
                          trimStart: videoStartTime,
                          trimEnd: videoEndTime,
                          trimDuration: videoEndTime - videoStartTime,
                          fileName: imagePreview.fileName + ` (trimmed ${(videoEndTime - videoStartTime).toFixed(1)}s)`
                        });
                        
                        toast.success(
                          <div>
                            <h3 className="font-medium">Video trimmed</h3>
                            <p>From {videoStartTime.toFixed(1)}s to {videoEndTime.toFixed(1)}s</p>
                            <p className="text-xs mt-1">Duration: {(videoEndTime - videoStartTime).toFixed(1)}s</p>
                          </div>, 
                          { duration: 3000 }
                        );
                        
                        setShowVideoEditor(false);
                      }}
                    >
                      Apply Trim
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Camera Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-base-300 rounded-xl p-4 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Camera</h3>
              <button
                type="button"
                onClick={closeCamera}
                className="btn btn-sm btn-ghost btn-circle"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative bg-black rounded-lg overflow-hidden mb-4">
              {!capturedPhoto ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={takePhoto}
                    className="absolute bottom-4 left-1/2 transform -translate-x-1/2
                               w-12 h-12 rounded-full bg-white flex items-center justify-center
                               border-4 border-gray-800"
                  />
                </>
              ) : (
                <img
                  src={capturedPhoto}
                  alt="Captured"
                  className="w-full rounded-lg"
                />
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="flex justify-center gap-4">
              {capturedPhoto ? (
                <>
                  <button
                    type="button"
                    onClick={retakePhoto}
                    className="btn btn-sm"
                  >
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={usePhoto}
                    className="btn btn-sm btn-primary"
                  >
                    Use Photo
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={takePhoto}
                  className="btn btn-sm btn-primary"
                >
                  Capture
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Link Preview for input */}
      {inputUrl && (
        <div className="mb-2">
          <CustomLinkPreview url={inputUrl} />
        </div>
      )}
      {/* Poll/Event Modals */}
      <PollModal open={showPollModal} onClose={() => setShowPollModal(false)} onSubmit={handleCreatePoll} />
      <EventModal open={showEventModal} onClose={() => setShowEventModal(false)} onSubmit={handleCreateEvent} />
    </div>
  );
};
export default MessageInput;