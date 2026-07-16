import React from 'react';
import { User } from 'lucide-react';

export default function Avatar({ src, name = 'User', size = 32, className = '' }) {
  const style = { width: size, height: size };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={style}
        className={`rounded-full object-cover ${className}`}
      />
    );
  }

  // Neutral fallback: mist circle + forest User icon
  const iconSize = Math.round(size * 0.55); // icon is ~55% of container
  return (
    <div
      style={style}
      className={`rounded-full bg-mist flex items-center justify-center flex-shrink-0 ${className}`}
    >
      <User style={{ width: iconSize, height: iconSize }} className="text-forest" />
    </div>
  );
}
