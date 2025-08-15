import { useState, useRef, useEffect } from "react";
import { X, Type, Image, Camera, Bold, Italic, AlignCenter, AlignLeft, AlignRight } from "lucide-react";
import Cropper from "react-easy-crop";
import { useStatusStore } from "../store/useStatusStore";
import { useChatStore } from "../store/useChatStore";
import toast from "react-hot-toast";
import "./StatusCreateModal.css";

const StatusCreateModal = ({ isOpen, onClose, defaultPrivacy }) => {
  const [statusType, setStatusType] = useState("text"); // text | image | video
  const [text, setText] = useState("");
  const [caption, setCaption] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("#075E54");
  const [fontStyle, setFontStyle] = useState("normal");
  const [fontFamily, setFontFamily] = useState("sans-serif");
  const [textAlign, setTextAlign] = useState("center");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoTrim, setVideoTrim] = useState({ start: 0, end: 0 });
  const [visibility, setVisibility] = useState(defaultPrivacy?.visibility || "contacts");
  const [specificUsers, setSpecificUsers] = useState(defaultPrivacy?.specificUsers || []);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  // Update privacy state if defaultPrivacy changes (e.g. after modal save)
  useEffect(() => {
    setVisibility(defaultPrivacy?.visibility || "contacts");
    setSpecificUsers(defaultPrivacy?.specificUsers || []);
  }, [defaultPrivacy]);
  const [contactSearch, setContactSearch] = useState("");
  const [filteredContacts, setFilteredContacts] = useState([]);
  const { allUsers, getAllUsers } = useChatStore();
  // Fetch all contacts for privacy selection
  useEffect(() => {
    if ((visibility === "contactsExcept" || visibility === "onlyShareWith") && allUsers.length === 0) {
      getAllUsers();
    }
  }, [visibility, allUsers.length, getAllUsers]);

  useEffect(() => {
    if (contactSearch.trim() && allUsers.length > 0) {
      setFilteredContacts(
        allUsers.filter(u =>
          u.fullName.toLowerCase().includes(contactSearch.toLowerCase()) ||
          u.username.toLowerCase().includes(contactSearch.toLowerCase())
        )
      );
    } else {
      setFilteredContacts(allUsers);
    }
  }, [contactSearch, allUsers]);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const { createTextStatus, createImageStatus, createVideoStatus, isCreatingStatus } = useStatusStore();

  // Background color options - extended color palette
  const backgroundColors = [
    "#075E54", // WhatsApp Green
    "#128C7E", // Dark Green
    "#25D366", // Light Green
    "#DCF8C6", // Light Green Background
    "#FF6B6B", // Red
    "#4ECDC4", // Teal
    "#45B7D1", // Blue
    "#96CEB4", // Mint
    "#FFEAA7", // Yellow
    "#DDA0DD", // Plum
    "#FFB6C1", // Light Pink
    "#87CEEB", // Sky Blue
    "#D7263D", // Crimson
    "#F46036", // Burnt Orange
    "#2E294E", // Dark Purple
    "#1B998B", // Jade
    "#C5D86D", // Citron
    "#F9DC5C", // Mustard Yellow
    "#EFCB68", // Gold
    "#E8C1C5", // Rose
    "#590004", // Maroon
    "#003459", // Navy Blue
    "#00A878", // Emerald Green
    "#6C5B7B", // Dark Lavender
  ];

  // Font family options
  const fontFamilies = [
    { name: "Sans Serif", value: "sans-serif" },
    { name: "Serif", value: "serif" },
    { name: "Monospace", value: "monospace" },
    { name: "Cursive", value: "cursive" },
    { name: "Fantasy", value: "fantasy" },
    { name: "System UI", value: "system-ui" },
    { name: "Arial", value: "Arial, sans-serif" },
    { name: "Georgia", value: "Georgia, serif" },
    { name: "Comic Sans MS", value: "'Comic Sans MS', cursive" },
    { name: "Impact", value: "Impact, fantasy" },
    { name: "Courier New", value: "'Courier New', monospace" },
  ];

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error("Image size should be less than 10MB");
        return;
      }

      setSelectedImage(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };
  const handleVideoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video must be less than 50MB');
      return;
    }
    setSelectedVideo(file);
    const url = URL.createObjectURL(file);
    setVideoPreview(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (statusType === "text") {
        if (!text.trim()) {
          toast.error("Please enter status text");
          return;
        }

        await createTextStatus({
          text: text.trim(),
          backgroundColor,
          fontStyle,
          fontFamily,
          textAlign,
          visibility,
          specificUsers: visibility === "onlyShareWith" ? specificUsers : []
        });
  } else if (statusType === 'image') {
        if (!selectedImage) {
          toast.error("Please select an image");
          return;
        }

        // Create cropped image blob using canvas
        const createCroppedImageBlob = async (dataUrl, cropPixels) => {
          if (!dataUrl || !cropPixels) return null;
          const image = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = dataUrl;
          });
          const canvas = document.createElement('canvas');
          const targetW = 1080; const targetH = 1920; // story size
          canvas.width = targetW; canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          // Draw the cropped region scaled to 1080x1920
          const { x, y, width, height } = cropPixels;
          ctx.drawImage(image, x, y, width, height, 0, 0, targetW, targetH);
          const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
          return blob;
        };

        let blob = null;
        try {
          blob = await createCroppedImageBlob(imagePreview, croppedAreaPixels);
        } catch (err) {
          console.error('Error creating cropped image:', err);
        }

        const formData = new FormData();
        if (blob) {
          const fileName = selectedImage?.name?.replace(/\.(png|jpg|jpeg|webp)$/i, '') || 'status';
          formData.append("image", new File([blob], `${fileName}.jpg`, { type: 'image/jpeg' }));
        } else {
          // Fallback to original if crop failed
          formData.append("image", selectedImage);
        }
        if (caption.trim()) {
          formData.append("caption", caption.trim());
        }
        formData.append("visibility", visibility);
        if (visibility === "onlyShareWith") {
          formData.append("specificUsers", JSON.stringify(specificUsers));
        }

        await createImageStatus(formData);
      } else if (statusType === 'video') {
        if (!selectedVideo) {
          toast.error('Please select a video');
          return;
        }
        const formData = new FormData();
        formData.append('video', selectedVideo);
        if (caption.trim()) formData.append('caption', caption.trim());
        formData.append('visibility', visibility);
        formData.append('duration', Math.round(videoDuration || 0));
        formData.append('trimStart', Math.round(videoTrim.start || 0));
        formData.append('trimEnd', Math.round(videoTrim.end || 0));
        if (visibility === 'onlyShareWith') {
          formData.append('specificUsers', JSON.stringify(specificUsers));
        }
        await createVideoStatus(formData);
      }

      // Reset form and close modal
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error creating status:", error);
    }
  };

  const resetForm = () => {
    setText("");
    setCaption("");
    setBackgroundColor("#075E54");
    setFontStyle("normal");
    setFontFamily("sans-serif");
    setTextAlign("center");
    setSelectedImage(null);
    setImagePreview(null);
  setCrop({ x: 0, y: 0 });
  setZoom(1);
  setCroppedAreaPixels(null);
  if (videoPreview) URL.revokeObjectURL(videoPreview);
  setSelectedVideo(null);
  setVideoPreview(null);
  setVideoDuration(0);
  setVideoTrim({ start: 0, end: 0 });
    setStatusType("text");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="status-modal-glass w-full max-w-md max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-base-300">
          <h2 className="text-xl font-bold tracking-tight">Create Status</h2>
          <button
            onClick={handleClose}
            className="status-action-btn cancel px-3 py-2"
            type="button"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(92vh-120px)]">
          {/* Status Type Selector */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setStatusType('text')}
              className={`status-action-btn px-4 py-2 flex items-center gap-2 ${statusType === 'text' ? 'primary' : ''}`}
              type="button"
            >
              <Type size={16} /> Text
            </button>
            <button
              onClick={() => setStatusType('image')}
              className={`status-action-btn px-4 py-2 flex items-center gap-2 ${statusType === 'image' ? 'primary' : ''}`}
              type="button"
            >
              <Image size={16} /> Image
            </button>
            <button
              onClick={() => setStatusType('video')}
              className={`status-action-btn px-4 py-2 flex items-center gap-2 ${statusType === 'video' ? 'primary' : ''}`}
              type="button"
            >
              <Camera size={16} /> Video
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            {statusType === 'text' ? (
              <>
                {/* Text Status Preview */}
                <div
                  className="status-preview-box w-full h-48"
                  style={{ backgroundColor, fontFamily, textAlign }}
                >
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="What's on your mind?"
                    className={`w-full h-full bg-transparent text-white placeholder-white/70 resize-none border-none outline-none text-lg ${
                      fontStyle === 'bold' ? 'font-bold' :
                      fontStyle === 'italic' ? 'italic' :
                      fontStyle === 'bold-italic' ? 'font-bold italic' : ''
                    }`}
                    style={{ fontFamily, textAlign }}
                    maxLength={700}
                  />
                  <span className="status-char-count">{text.length}/700</span>
                </div>
                {/* Background Colors */}
                <div>
                  <label className="block text-sm font-medium mb-2">Background Color</label>
                  <div className="grid grid-cols-6 gap-2">
                    {backgroundColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setBackgroundColor(color)}
                        className={`status-color-btn w-8 h-8 rounded-full ${backgroundColor === color ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        aria-label={`Set background color ${color}`}
                      />
                    ))}
                  </div>
                </div>
                {/* Font Family */}
                <div>
                  <label className="block text-sm font-medium mb-2">Font Family</label>
                  <select
                    value={fontFamily}
                    onChange={e => setFontFamily(e.target.value)}
                    className="status-font-select w-full"
                  >
                    {fontFamilies.map(font => (
                      <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>{font.name}</option>
                    ))}
                  </select>
                </div>
                {/* Font Style */}
                <div>
                  <label className="block text-sm font-medium mb-2">Font Style</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setFontStyle('normal')} className={`status-action-btn px-3 py-1 ${fontStyle === 'normal' ? 'primary' : ''}`}>Normal</button>
                    <button type="button" onClick={() => setFontStyle('bold')} className={`status-action-btn px-3 py-1 font-bold ${fontStyle === 'bold' ? 'primary' : ''}`}><Bold size={16} /></button>
                    <button type="button" onClick={() => setFontStyle('italic')} className={`status-action-btn px-3 py-1 italic ${fontStyle === 'italic' ? 'primary' : ''}`}><Italic size={16} /></button>
                    <button type="button" onClick={() => setFontStyle('bold-italic')} className={`status-action-btn px-3 py-1 font-bold italic ${fontStyle === 'bold-italic' ? 'primary' : ''}`}>B+I</button>
                  </div>
                </div>
                {/* Text Alignment */}
                <div>
                  <label className="block text-sm font-medium mb-2">Text Alignment</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setTextAlign('left')} className={`status-action-btn px-3 py-1 ${textAlign === 'left' ? 'primary' : ''}`}><AlignLeft size={16} /></button>
                    <button type="button" onClick={() => setTextAlign('center')} className={`status-action-btn px-3 py-1 ${textAlign === 'center' ? 'primary' : ''}`}><AlignCenter size={16} /></button>
                    <button type="button" onClick={() => setTextAlign('right')} className={`status-action-btn px-3 py-1 ${textAlign === 'right' ? 'primary' : ''}`}><AlignRight size={16} /></button>
                  </div>
                </div>
              </>
            ) : statusType === 'image' ? (
              <>
                {/* Image Status */}
                <div className="space-y-4">
                  {/* Image Upload */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    {imagePreview ? (
                      <div className="relative w-full h-64 rounded-lg overflow-hidden bg-black">
                        <Cropper
                          image={imagePreview}
                          crop={crop}
                          zoom={zoom}
                          aspect={9/16}
                          onCropChange={setCrop}
                          onZoomChange={setZoom}
                          onCropComplete={(croppedArea, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
                          objectFit="contain"
                          restrictPosition={true}
                          minZoom={1}
                          maxZoom={3}
                          showGrid={false}
                        />
                        <div className="absolute bottom-2 left-0 right-0 px-4">
                          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e)=>setZoom(parseFloat(e.target.value))} className="range range-xs" />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedImage(null);
                            setImagePreview(null);
                            setCrop({ x: 0, y: 0 });
                            setZoom(1);
                            setCroppedAreaPixels(null);
                          }}
                          className="absolute top-2 right-2 status-action-btn cancel px-2 py-1"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-48 border-2 border-dashed border-base-300 rounded-lg flex flex-col items-center justify-center hover:border-primary transition-colors"
                      >
                        <Camera size={48} className="text-base-content/50 mb-2" />
                        <span className="text-base-content/70">Click to select image</span>
                      </button>
                    )}
                  </div>
                  {/* Caption */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Caption (optional)</label>
                    <textarea
                      value={caption}
                      onChange={e => setCaption(e.target.value)}
                      placeholder="Add a caption..."
                      className="status-font-select w-full"
                      rows={3}
                      maxLength={700}
                    />
                    <div className="text-right text-xs text-base-content/60 mt-1">{caption.length}/700</div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Video Status */}
                <div className="space-y-4">
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleVideoSelect}
                      className="hidden"
                    />
                    {videoPreview ? (
                      <div className="relative">
                        <video
                          ref={videoRef}
                          src={videoPreview}
                          className="w-full h-48 rounded-lg"
                          controls
                          onLoadedMetadata={(e) => {
                            const d = e.currentTarget.duration || 0;
                            setVideoDuration(d);
                            setVideoTrim({ start: 0, end: Math.min(30, Math.round(d)) });
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (videoPreview) URL.revokeObjectURL(videoPreview);
                            setSelectedVideo(null);
                            setVideoPreview(null);
                            setVideoDuration(0);
                          }}
                          className="absolute top-2 right-2 status-action-btn cancel px-2 py-1"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-48 border-2 border-dashed border-base-300 rounded-lg flex flex-col items-center justify-center hover:border-primary transition-colors"
                      >
                        <Camera size={48} className="text-base-content/50 mb-2" />
                        <span className="text-base-content/70">Click to select video</span>
                      </button>
                    )}
                  </div>
                  {videoPreview && (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">Trim (max 30s)</label>
                      <div className="flex items-center gap-2 text-sm">
                        <span>{Math.round(videoTrim.start)}s</span>
                        <input type="range" min={0} max={Math.max(30, Math.round(videoDuration))} value={videoTrim.start} onChange={e => setVideoTrim(v => ({ ...v, start: Math.min(Number(e.target.value), v.end - 1) }))} className="range range-xs flex-1" />
                        <input type="range" min={1} max={Math.min(30, Math.round(videoDuration))} value={videoTrim.end} onChange={e => setVideoTrim(v => ({ ...v, end: Math.max(Number(e.target.value), v.start + 1) }))} className="range range-xs flex-1" />
                        <span>{Math.round(videoTrim.end)}s</span>
                      </div>
                      <div className="text-xs text-base-content/60">Note: Trimming is visual only. The full clip will be uploaded.</div>
                    </div>
                  )}
                  {/* Caption */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Caption (optional)</label>
                    <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Add a caption..." className="status-font-select w-full" rows={3} maxLength={700} />
                    <div className="text-right text-xs text-base-content/60 mt-1">{caption.length}/700</div>
                  </div>
                </div>
              </>
            )}
            {/* Privacy Settings */}
            <div className="border-t border-base-300 pt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">Privacy Settings</label>
                <button
                  type="button"
                  onClick={() => setShowPrivacySettings(!showPrivacySettings)}
                  className="text-primary text-sm hover:underline"
                >
                  {showPrivacySettings ? 'Hide' : 'Show'}
                </button>
              </div>
              {showPrivacySettings && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="visibility"
                        value="contacts"
                        checked={visibility === 'contacts'}
                        onChange={e => setVisibility(e.target.value)}
                        className="radio radio-primary radio-sm"
                      />
                      <span className="text-sm">My contacts</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="visibility"
                        value="contactsExcept"
                        checked={visibility === 'contactsExcept'}
                        onChange={e => setVisibility(e.target.value)}
                        className="radio radio-primary radio-sm"
                      />
                      <span className="text-sm">My contacts except...</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="visibility"
                        value="onlyShareWith"
                        checked={visibility === 'onlyShareWith'}
                        onChange={e => setVisibility(e.target.value)}
                        className="radio radio-primary radio-sm"
                      />
                      <span className="text-sm">Only share with...</span>
                    </label>
                  </div>
                  {(visibility === 'contactsExcept' || visibility === 'onlyShareWith') && (
                    <div className="bg-base-200 p-2 rounded">
                      <div className="mb-2">
                        <input
                          type="text"
                          className="input input-bordered w-full text-sm"
                          placeholder="Search contacts..."
                          value={contactSearch}
                          onChange={e => setContactSearch(e.target.value)}
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto border rounded bg-base-100">
                        {filteredContacts.length === 0 && (
                          <div className="p-2 text-xs text-base-content/60">No contacts found.</div>
                        )}
                        {filteredContacts.map(user => (
                          <label key={user._id} className="flex items-center gap-2 px-2 py-1 hover:bg-base-200 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={specificUsers.includes(user._id)}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSpecificUsers(prev => [...prev, user._id]);
                                } else {
                                  setSpecificUsers(prev => prev.filter(id => id !== user._id));
                                }
                              }}
                              className="checkbox checkbox-sm checkbox-primary"
                            />
                            <img src={user.profilePic} alt={user.fullName} className="w-6 h-6 rounded-full object-cover" />
                            <span className="text-sm">{user.fullName} <span className="text-xs text-base-content/60">@{user.username}</span></span>
                          </label>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-base-content/60">
                        {visibility === 'contactsExcept'
                          ? `All contacts except selected will see your status.`
                          : `Only selected contacts will see your status.`}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Submit/Cancel Buttons */}
            <div className="flex gap-3 mt-2">
              <button
                type="submit"
                disabled={isCreatingStatus}
                className="status-action-btn primary flex-1"
              >
                {isCreatingStatus ? 'Creating...' : 'Post Status'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="status-action-btn cancel flex-1"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StatusCreateModal;
