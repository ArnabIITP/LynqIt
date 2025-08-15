import React from "react";

const colors = [
  'bg-primary/20 text-primary',
  'bg-indigo-200 text-indigo-600',
  'bg-emerald-200 text-emerald-600',
  'bg-rose-200 text-rose-600',
  'bg-amber-200 text-amber-700',
  'bg-sky-200 text-sky-700'
];

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  if (parts.length === 0) return '👥';
  return parts.map(p => p[0]?.toUpperCase()).join('');
}

function colorClass(name = '') {
  if (!name) return colors[0];
  const hash = Array.from(name).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export default function GroupAvatar({ name, avatarUrl, size = 12, className = '' }) {
  const sizeClass = typeof size === 'number' ? `size-${size}` : size; // allow tailwind size classes
  if (avatarUrl) {
    return (
      <img src={avatarUrl} alt={name} className={`${sizeClass} object-cover rounded-full ${className}`} />
    );
  }
  const initials = getInitials(name);
  const colorsCls = colorClass(name);
  return (
    <div className={`${sizeClass} ${colorsCls} rounded-full flex items-center justify-center ${className}`}>
      <span className="font-semibold">
        {typeof initials === 'string' && initials.length > 2 ? initials.slice(0, 2) : initials}
      </span>
    </div>
  );
}
