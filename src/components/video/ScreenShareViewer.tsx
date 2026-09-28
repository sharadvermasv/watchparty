"use client";

import { useEffect, useRef } from "react";
import { Monitor, StopCircle, AlertTriangle, ShieldCheck, Maximize } from "lucide-react";

interface ScreenShareViewerProps {
  isSharing: boolean;
  isHost: boolean;
  isLocallySharing?: boolean;
  onStartShare: () => void;
  onStopShare: () => void;
  stream: MediaStream | null;
}

export function ScreenShareViewer({
  isLocallySharing = false,
  onStartShare,
  onStopShare,
  stream,
}: ScreenShareViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {});
        }
      });
    }
  }, [stream]);

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        videoRef.current.requestFullscreen().catch(() => {});
      }
    }
  };

  return (
    <div className="relative w-full h-full bg-[#07080b] flex flex-col items-center justify-center overflow-hidden">
      {stream ? (
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          <video
            ref={videoRef}
            playsInline
            autoPlay
            className="w-full h-full object-contain"
          />

          {/* Floating Screen Share status banner */}
          <div className="absolute top-4 left-6 right-6 flex items-center justify-between pointer-events-auto z-30">
            <div className="flex items-center gap-3 glass-dock px-4 py-2 rounded-full shadow-xl">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-sm" />
              <span className="text-xs font-semibold text-white/95">
                {isLocallySharing ? "You are sharing your screen" : "Live Screen Share"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleFullscreen}
                className="p-2 text-white/80 hover:text-white glass-dock hover:bg-white/[0.15] rounded-full transition cursor-pointer shadow-md active:scale-95"
                title="Fullscreen"
              >
                <Maximize className="w-4 h-4" />
              </button>

              {isLocallySharing && (
                <button
                  onClick={onStopShare}
                  className="flex items-center gap-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 px-3.5 py-1.5 rounded-full font-semibold transition cursor-pointer shadow-md active:scale-95"
                >
                  <StopCircle className="w-3.5 h-3.5" />
                  Stop Sharing
                </button>
              )}
            </div>
          </div>

          {/* DRM / Protected Content notice */}
          <div className="absolute bottom-4 left-6 max-w-sm pointer-events-auto">
            <div className="glass-panel p-3 rounded-2xl shadow-xl flex items-start gap-2.5 text-left border border-white/[0.12]">
              <ShieldCheck className="w-4 h-4 text-[#FF5733] shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#A7ABB5] leading-relaxed">
                If the shared screen appears black, that application or browser tab has DRM protection enabled. Try sharing an application window or different tab.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Empty / Ready to Share Screen state */
        <div className="max-w-md w-full p-8 mx-4 text-center flex flex-col items-center glass-panel rounded-3xl border border-white/[0.14] shadow-2xl animate-fade-in">
          <div className="relative mb-5">
            <div className="absolute -inset-2 bg-[#FF5733]/30 rounded-2xl blur-lg animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/20 flex items-center justify-center text-[#FF5733] shadow-xl">
              <Monitor className="w-8 h-8" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-white mb-2 tracking-tight">
            Share your screen
          </h2>
          <p className="text-xs sm:text-sm text-[#A7ABB5] leading-relaxed mb-6 max-w-sm">
            Perfect for websites, local videos, games, presentations, and anything else you want to watch together.
          </p>

          <button
            onClick={onStartShare}
            className="flex items-center gap-2 bg-gradient-to-r from-[#FF5733] to-[#ff724d] hover:brightness-110 text-white px-7 py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#FF5733]/30 transition cursor-pointer border border-white/20 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Monitor className="w-4 h-4" />
            Share Screen
          </button>

          <div className="mt-7 flex items-center gap-2 text-xs text-[#A7ABB5]/70">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Standard browser screen capture. No plugins required.</span>
          </div>
        </div>
      )}
    </div>
  );
}
