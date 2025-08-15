import React, { useRef, useState, useEffect } from 'react';

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

// Helper to extract frame thumbnails
const getVideoThumbnails = async (videoSrc, count = 10) => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = videoSrc;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.addEventListener('loadedmetadata', () => {
      const duration = video.duration;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const width = 80, height = 48;
      canvas.width = width;
      canvas.height = height;
      let frames = [];
      let i = 0;
      const capture = () => {
        if (i >= count) {
          resolve(frames);
          return;
        }
        video.currentTime = (duration * i) / (count - 1);
      };
      video.addEventListener('seeked', () => {
        ctx.drawImage(video, 0, 0, width, height);
        frames.push(canvas.toDataURL('image/jpeg'));
        i++;
        capture();
      });
      capture();
    });
  });
};

const VideoTrimmer = ({ videoSrc, onTrim, onCancel }) => {
  const videoRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [dragging, setDragging] = useState(null); // 'start' | 'end' | null
  const [thumbnails, setThumbnails] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const timelineWidth = 320;
  const snapInterval = 0.5; // seconds

  useEffect(() => {
    if (videoRef.current && videoRef.current.readyState >= 1) {
      setDuration(videoRef.current.duration);
      setEnd(videoRef.current.duration);
    }
    // Extract thumbnails
    getVideoThumbnails(videoSrc, 10).then(setThumbnails);
  }, [videoSrc]);

  const handleLoadedMetadata = () => {
    const dur = videoRef.current.duration;
    setDuration(dur);
    setEnd(dur);
    // Seek to start of segment
    if (videoRef.current) videoRef.current.currentTime = start;
  };

  // Live preview: play only the trimmed segment
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => {
      if (video.currentTime > end) {
        video.pause();
        setIsPlaying(false);
        video.currentTime = start;
      }
    };
    video.addEventListener('timeupdate', onTimeUpdate);
    return () => video.removeEventListener('timeupdate', onTimeUpdate);
  }, [start, end]);

  // When handles move, seek to new start
  useEffect(() => {
    if (videoRef.current) videoRef.current.currentTime = start;
  }, [start]);

  // Timeline drag logic
  const handleTimelineClick = (e) => {
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / timelineWidth;
    const time = clamp(Math.round((percent * duration) / snapInterval) * snapInterval, 0, duration);
    if (Math.abs(time - start) < Math.abs(time - end)) setStart(clamp(time, 0, end - snapInterval));
    else setEnd(clamp(time, start + snapInterval, duration));
  };

  const handleDrag = (which, e) => {
    const rect = e.target.parentNode.getBoundingClientRect();
    const x = e.touches ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const percent = x / timelineWidth;
    const time = clamp(Math.round((percent * duration) / snapInterval) * snapInterval, 0, duration);
    if (which === 'start') setStart(clamp(time, 0, end - snapInterval));
    else setEnd(clamp(time, start + snapInterval, duration));
  };

  const handleTrim = () => {
    onTrim({ start, end });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-base-100 rounded-lg p-6 shadow-xl w-full max-w-md flex flex-col items-center">
        <div className="relative w-full max-h-56 mb-4 flex flex-col items-center">
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full max-h-56 rounded-lg"
            style={{ background: '#222' }}
            onLoadedMetadata={handleLoadedMetadata}
            controls={false}
          />
          <div className="flex gap-2 mt-2">
            <button
              className="btn btn-xs btn-primary"
              onClick={() => {
                if (!videoRef.current) return;
                if (isPlaying) {
                  videoRef.current.pause();
                  setIsPlaying(false);
                } else {
                  videoRef.current.currentTime = start;
                  videoRef.current.play();
                  setIsPlaying(true);
                }
              }}
              type="button"
            >
              {isPlaying ? 'Pause' : 'Play segment'}
            </button>
            <span className="text-xs text-base-content/60">Preview trimmed segment</span>
          </div>
        </div>
        <div className="w-full flex flex-col items-center gap-2 mt-2">
          {/* Thumbnails timeline */}
          <div className="relative w-[320px] h-12 flex items-center select-none mb-2">
            {thumbnails.length > 0 && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 flex w-full h-12 z-0">
                {thumbnails.map((thumb, idx) => (
                  <img key={idx} src={thumb} alt="frame" className="w-1/10 h-full object-cover" style={{ width: `${timelineWidth / thumbnails.length}px` }} />
                ))}
              </div>
            )}
            {/* Timeline bar */}
            <div className="absolute top-1/2 left-0 w-full h-2 bg-base-200 rounded-full -translate-y-1/2 z-1" />
            {/* Selected segment */}
            <div
              className="absolute top-1/2 h-2 bg-tangerine rounded-full -translate-y-1/2 z-2"
              style={{ left: `${(start/duration)*100}%`, width: `${((end-start)/duration)*100}%` }}
            />
            {/* Start handle */}
            <div
              className="absolute top-1/2 w-4 h-8 bg-primary border-2 border-white rounded-lg -translate-y-1/2 cursor-ew-resize z-10"
              style={{ left: `calc(${(start/duration)*100}% - 8px)` }}
              draggable
              onMouseDown={() => setDragging('start')}
              onTouchStart={() => setDragging('start')}
            />
            {/* End handle */}
            <div
              className="absolute top-1/2 w-4 h-8 bg-primary border-2 border-white rounded-lg -translate-y-1/2 cursor-ew-resize z-10"
              style={{ left: `calc(${(end/duration)*100}% - 8px)` }}
              draggable
              onMouseDown={() => setDragging('end')}
              onTouchStart={() => setDragging('end')}
            />
          </div>
          <div className="flex justify-between w-full text-xs text-base-content/70">
            <span>Start: {start.toFixed(1)}s</span>
            <span>End: {end.toFixed(1)}s</span>
            <span>Duration: {(end-start).toFixed(1)}s</span>
          </div>
        </div>
        <div className="flex gap-4 mt-6">
          <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={handleTrim}>Trim</button>
        </div>
      </div>
      {/* Drag logic listeners */}
      {dragging && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
          onMouseMove={e => { handleDrag(dragging, e); }}
          onMouseUp={() => setDragging(null)}
          onTouchMove={e => { handleDrag(dragging, e); }}
          onTouchEnd={() => setDragging(null)}
        />
      )}
    </div>
  );
};

export default VideoTrimmer;
