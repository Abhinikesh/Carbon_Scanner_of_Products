import React, { useEffect, useState } from 'react';

/**
 *
 * Design:
 */
export default function SplashScreen({ done }) {
  const [fading, setFading] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (done) {
      // Start fade-out after a short delay so the logo is visible at least briefly
      const fadeTimer = setTimeout(() => setFading(true), 200);
      // Fully unmount after fade completes
      const hideTimer = setTimeout(() => setHidden(true), 800);
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [done]);

  if (hidden) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(145deg, #0f2419 0%, #1a3d2b 50%, #1e4d35 100%)',
        transition: 'opacity 0.6s ease',
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? 'none' : 'all',
      }}
    >
      {/* Ambient glow behind the logo */}
      <div
        style={{
          position: 'absolute',
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 70%)',
          animation: 'splashGlow 3s ease-in-out infinite',
        }}
      />

      {/* Logo */}
      <div
        style={{
          animation: 'splashScale 2.4s ease-in-out infinite',
          marginBottom: 28,
          position: 'relative',
        }}
      >
        <img
          src="/climate_lens_logo.png"
          alt="Climate Lens"
          style={{
            width: 96,
            height: 96,
            objectFit: 'contain',
            filter: 'drop-shadow(0 8px 24px rgba(52,211,153,0.35))',
          }}
        />
      </div>

      {/* Wordmark */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1
          style={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 700,
            fontSize: 28,
            color: '#f0f5f2',
            letterSpacing: '-0.5px',
            margin: '0 0 6px',
          }}
        >
          Climate Lens
        </h1>
        <p
          style={{
            fontFamily: '"Inter", sans-serif',
            fontWeight: 400,
            fontSize: 13,
            color: 'rgba(240,245,242,0.55)',
            margin: 0,
            letterSpacing: '0.4px',
          }}
        >
          Track the real carbon cost of everything
        </p>
      </div>

      {/* Animated dot loader */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#34d399',
              animation: `splashDot 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Keyframe styles injected inline */}
      <style>{`
        @keyframes splashScale {
          0%, 100% { transform: scale(1);     }
          50%       { transform: scale(1.06); }
        }
        @keyframes splashGlow {
          0%, 100% { transform: scale(1);    opacity: 0.7; }
          50%       { transform: scale(1.2); opacity: 1;   }
        }
        @keyframes splashDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.35; }
          40%            { transform: scale(1);   opacity: 1;    }
        }
      `}</style>
    </div>
  );
}
