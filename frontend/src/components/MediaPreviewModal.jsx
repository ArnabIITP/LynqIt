import React from 'react';

const MediaPreviewModal = ({
  type, // 'image' or 'video'
  src,
  fileName,
  onEdit,
  onSend,
  onCancel
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-base-100 rounded-lg p-6 shadow-xl w-full max-w-md flex flex-col items-center">
        <div className="w-full flex flex-col items-center mb-4">
          {type === 'image' ? (
            <img src={src} alt="Preview" className="max-h-72 rounded-lg border border-base-300" />
          ) : (
            <video src={src} controls className="max-h-72 rounded-lg border border-base-300" />
          )}
          <div className="mt-2 text-sm text-base-content/70 truncate w-full text-center">{fileName}</div>
        </div>
        <div className="flex gap-4 mt-2 w-full justify-center">
          <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
          <button className="btn btn-secondary" onClick={onEdit}>{type === 'image' ? 'Edit' : 'Trim'}</button>
          <button className="btn btn-primary" onClick={onSend}>Send</button>
        </div>
      </div>
    </div>
  );
};

export default MediaPreviewModal;
