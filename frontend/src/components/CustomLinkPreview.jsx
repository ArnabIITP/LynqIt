


import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLinkPreviewStore } from "../store/useLinkPreviewStore";

const CustomLinkPreview = ({ url }) => {
  const getPreview = useLinkPreviewStore(s => s.getPreview);
  const setPreviewCache = useLinkPreviewStore(s => s.setPreview);
  const [preview, setPreview] = useState(() => getPreview(url));
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchPreview = () => {
    if (!url) return;
    setLoading(true);
    setPreview(null);
    setError(null);
    axios.get(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then(res => {
        setPreview(res.data);
        setPreviewCache(url, res.data);
        setError(null);
      })
      .catch(err => {
        setError("Could not load preview");
        setPreview(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!url) return;
    const cached = getPreview(url);
    if (cached) {
      setPreview(cached);
      setError(null);
      return;
    }
    fetchPreview();
    // eslint-disable-next-line
  }, [url]);

  if (!url) return null;
  if (loading) return <div className="text-xs text-base-content/50">Loading preview...</div>;
  if (error) return <div className="text-xs text-error flex items-center gap-2">{error} <button className="btn btn-xs btn-outline ml-2" onClick={fetchPreview}>Retry</button></div>;
  if (!preview) return null;

  return (
    <a href={preview.url || url} target="_blank" rel="noopener noreferrer" className="block border rounded-lg p-2 mt-2 mb-2 bg-base-200 hover:bg-base-300 transition">
      {preview.images && preview.images[0] && (
        <img src={preview.images[0]} alt="preview" className="w-full max-h-40 object-cover rounded mb-2" />
      )}
      <div className="font-semibold text-base-content line-clamp-1">{preview.title || url}</div>
      {preview.description && <div className="text-xs text-base-content/70 line-clamp-2">{preview.description}</div>}
      <div className="text-xs text-base-content/50 mt-1">{preview.siteName || preview.url || url}</div>
    </a>
  );
};

export default CustomLinkPreview;
