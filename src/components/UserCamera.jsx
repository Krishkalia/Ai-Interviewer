import React, { useRef, useEffect, useState } from 'react';

export function UserCamera({ isMuted, isCameraOff, isSpeaking, subtitle }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function startCamera() {
      if (isCameraOff) {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }
        return;
      }

      try {
        const userStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: false
        });
        setStream(userStream);
        if (videoRef.current) {
          videoRef.current.srcObject = userStream;
        }
      } catch (err) {
        console.error('Camera access failed:', err);
        setError('Camera access denied or not found.');
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraOff]);

  return (
    <div className={`relative w-full aspect-video bg-[#0a0a0f] rounded-3xl overflow-hidden border-2 transition-all duration-500 shadow-2xl flex items-center justify-center ${isSpeaking ? 'border-[#8083ff] shadow-[0_0_40px_rgba(128,131,255,0.4)]' : 'border-white/5'}`}>
      {/* Video Feed */}
      {!isCameraOff && !error ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover mirror"
        />
      ) : (
        <div className="flex flex-col items-center gap-4 text-on-surface-variant/40">
          <span className="material-symbols-outlined text-6xl">videocam_off</span>
          <span className="text-sm font-medium uppercase tracking-widest">{error || 'Camera is Off'}</span>
        </div>
      )}

      {/* Internal Subtitle Overlay */}
      {subtitle && isSpeaking && (
        <div className="absolute bottom-6 left-0 w-full px-6 z-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="glass-panel px-4 py-2 rounded-xl border border-white/10 text-center backdrop-blur-xl">
             <p className="text-sm md:text-base font-bold text-[#c0c1ff] line-clamp-2 drop-shadow-sm">
               {subtitle}
             </p>
           </div>
        </div>
      )}

      {/* Identity Tag */}
      <div className="absolute top-4 left-4 glass-panel px-3 py-1.5 rounded-lg flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-tertiary shadow-[0_0_8px_rgba(128,131,255,0.6)]" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface">CANDIDATE (YOU)</span>
      </div>

      {/* Mic Status Icon */}
      {isMuted && (
        <div className="absolute top-4 right-4 bg-error/20 text-error p-2 rounded-full backdrop-blur-md">
          <span className="material-symbols-outlined text-sm">mic_off</span>
        </div>
      )}
    </div>
  );
}
