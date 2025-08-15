// Utility to detect file extension and return Cloudinary resource_type and folder

const extensionToResourceTypeAndFolder = {
  // Images
  jpg:   { resource_type: 'image', folder: 'images' },
  jpeg:  { resource_type: 'image', folder: 'images' },
  png:   { resource_type: 'image', folder: 'images' },
  gif:   { resource_type: 'image', folder: 'images' },
  webp:  { resource_type: 'image', folder: 'images' },
  bmp:   { resource_type: 'image', folder: 'images' },
  svg:   { resource_type: 'image', folder: 'images' },
  // Videos
  mp4:   { resource_type: 'video', folder: 'videos' },
  mov:   { resource_type: 'video', folder: 'videos' },
  avi:   { resource_type: 'video', folder: 'videos' },
  mkv:   { resource_type: 'video', folder: 'videos' },
  webm:  { resource_type: 'video', folder: 'videos' },
  m4v:   { resource_type: 'video', folder: 'videos' },
  // Audio
  mp3:   { resource_type: 'video', folder: 'audios' }, // Cloudinary uses video for audio
  wav:   { resource_type: 'video', folder: 'audios' },
  ogg:   { resource_type: 'video', folder: 'audios' },
  flac:  { resource_type: 'video', folder: 'audios' },
  // Documents
  pdf:   { resource_type: 'raw', folder: 'documents' },
  doc:   { resource_type: 'raw', folder: 'documents' },
  docx:  { resource_type: 'raw', folder: 'documents' },
  xls:   { resource_type: 'raw', folder: 'documents' },
  xlsx:  { resource_type: 'raw', folder: 'documents' },
  ppt:   { resource_type: 'raw', folder: 'documents' },
  pptx:  { resource_type: 'raw', folder: 'documents' },
  txt:   { resource_type: 'raw', folder: 'documents' },
  rtf:   { resource_type: 'raw', folder: 'documents' },
  zip:   { resource_type: 'raw', folder: 'archives' },
  rar:   { resource_type: 'raw', folder: 'archives' },
  // Default fallback
  default: { resource_type: 'raw', folder: 'others' }
};

export function detectResourceTypeAndFolder(filename, mimetype) {
  let ext = '';
  if (filename && filename.includes('.')) {
    ext = filename.split('.').pop().toLowerCase();
  }
  // Try to match by extension
  if (extensionToResourceTypeAndFolder[ext]) {
    return extensionToResourceTypeAndFolder[ext];
  }
  // Fallback: try mimetype
  if (mimetype) {
    if (mimetype.startsWith('image/')) return { resource_type: 'image', folder: 'images' };
    if (mimetype.startsWith('video/')) return { resource_type: 'video', folder: 'videos' };
    if (mimetype.startsWith('audio/')) return { resource_type: 'video', folder: 'audios' };
    if (mimetype.startsWith('application/pdf')) return { resource_type: 'raw', folder: 'documents' };
  }
  // Default fallback
  return extensionToResourceTypeAndFolder.default;
}
