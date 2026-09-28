"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Monitor, StopCircle, AlertTriangle, ShieldCheck, Maximize } from "lucide-react";

interface ScreenShareViewerProps {
  isSharing: boolean;
  isHost: boolean;
  onStartShare: () => void;
  onStopShare: () => void;
  stream: MediaStream | null;
}

export function ScreenShareViewer({
  isSharing,
  isHost,
  onStartShare,
  onStopShare,
  stream,
}: ScreenShareViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {
        // Autoplay may need muted
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
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="relative w-full h-full bg-[#08090B] flex flex-col items-center justify-center overflow-hidden">
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
            <div className="flex items-center gap-3 bg-[#111318]/90 border border-white/10 px-3.5 py-1.5 rounded-full backdrop-blur-md">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-medium text-white/90">
                {isHost ? "You are sharing your screen" : "Screen Share Active"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleFullscreen}
                className="p-2 text-white/70 hover:text-white bg-[#111318]/90 hover:bg-[#151820] border border-white/10 rounded-full transition cursor-pointer"
                title="Fullscreen"
              >
                <Maximize className="w-4 h-4" />
              </button>

              {isHost && (
                <button
                  onClick={onStopShare}
                  className="flex items-center gap-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-full font-medium transition cursor-pointer"
                >
                  <StopCircle className="w-3.5 h-3.5" />
                  Stop Sharing
                </button>
              )}
            </div>
          </div>

          {/* DRM / Protected Content notice */}
          <div className="absolute bottom-4 left-6 max-w-sm pointer-events-auto">
            <div className="bg-[#111318]/90 border border-white/10 p-2.5 rounded-xl backdrop-blur-md flex items-start gap-2.5 text-left">
              <ShieldCheck className="w-4 h-4 text-[#A7ABB5] shrink-0 mt-0.5" />
              <p className="text-[11px] text-[#A7ABB5] leading-relaxed">
                If the shared screen appears black, that application or browser tab has DRM protection enabled. Try sharing an application window or different tab.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Empty / Ready to Share Screen state */
        <div className="max-w-md w-full p-8 mx-auto text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FF5733]/10 border border-[#FF5733]/20 flex items-center justify-center mb-6 text-[#FF5733] shadow-lg shadow-[#FF5733]/5">
            <Monitor className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-white mb-2 tracking-tight">
            Share your screen
          </h2>
          <p className="text-sm text-[#A7ABB5] leading-relaxed mb-6 max-w-sm">
            Perfect for websites, local videos, games, presentations, and anything else you want to watch together.
          </p>

          <button
            onClick={onStartShare}
            className="flex items-center gap-2 bg-[#FF5733] hover:bg-[#ff6e4d] text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-[#FF5733]/20 transition cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Monitor className="w-4 h-4" />
            Share Screen
          </button>

          <div className="mt-8 flex items-center gap-2 text-xs text-[#6B7280]">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Standard browser screen capture. No plugins required.</span>
          </div>
        </div>
      )}
    </div>
  );
}
