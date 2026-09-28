"use client";

import { useState } from "react";
import { X, Film, Plus, Play, Sparkles } from "lucide-react";
import { detectMediaType } from "@/lib/sync/driftCalculator";

interface AddMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayNow: (url: string, title?: string) => void;
  onAddToQueue: (url: string, title?: string) => void;
  isHost: boolean;
}

export function AddMediaModal({
  isOpen,
  onClose,
  onPlayNow,
  onAddToQueue,
  isHost,
}: AddMediaModalProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const mediaType = detectMediaType(url);

  const handleSubmitPlay = (e: React.FormEvent) => {
    e.preventDefault();
    if (mediaType === "unknown" || !url.trim()) {
      setError("Please paste a valid video URL (YouTube, HLS .m3u8, or direct .mp4/.webm stream).");
      return;
    }
    const resolvedTitle = title.trim() || (mediaType === "hls" ? "HLS Live Stream" : mediaType === "direct_video" ? "Web Video Stream" : "YouTube Video");
    onPlayNow(url.trim(), resolvedTitle);
    setUrl("");
    setTitle("");
    onClose();
  };

  const handleQueue = () => {
    if (mediaType === "unknown" || !url.trim()) {
      setError("Please paste a valid video URL (YouTube, HLS .m3u8, or direct .mp4/.webm stream).");
      return;
    }
    const resolvedTitle = title.trim() || (mediaType === "hls" ? "HLS Live Stream" : mediaType === "direct_video" ? "Web Video Stream" : "YouTube Video");
    onAddToQueue(url.trim(), resolvedTitle);
    setUrl("");
    setTitle("");
    onClose();
  };

  // Curated demo streams testing YouTube, HLS, and Direct MP4
  const sampleVideos = [
    {
      title: "Big Buck Bunny (YouTube Sync)",
      url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
      badge: "YouTube",
    },
    {
      title: "Tears of Steel (Open-Source HLS .m3u8 Stream)",
      url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      badge: "HLS Stream",
    },
    {
      title: "Sintel Open Movie (Direct 4K MP4 Video)",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
      badge: "Direct MP4",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.7)] border border-white/[0.14]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#FF5733]/20 border border-[#FF5733]/30 text-[#FF5733] flex items-center justify-center shadow-lg shadow-[#FF5733]/20">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Watch Together</h3>
            <p className="text-xs text-[#A7ABB5]">Paste any YouTube link, HLS (.m3u8) feed, or direct video (.mp4) stream</p>
          </div>
        </div>

        <form onSubmit={handleSubmitPlay} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-1.5">
              Video or Stream URL
            </label>
            <input
              type="text"
              placeholder="https://... (YouTube, .m3u8, or .mp4)"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
              }}
              className="w-full glass-input rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-white/30 focus:outline-none transition"
              autoFocus
            />
            {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-1.5">
              Title <span className="text-white/40 normal-case">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Movie / Episode Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full glass-input rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-white/30 focus:outline-none transition"
            />
          </div>

          {/* Quick sample videos */}
          <div className="pt-1">
            <span className="text-[11px] font-medium text-white/60 flex items-center gap-1 mb-2">
              <Sparkles className="w-3 h-3 text-[#FF5733]" /> Try a demo format:
            </span>
            <div className="space-y-1.5">
              {sampleVideos.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setUrl(s.url);
                    setTitle(s.title);
                  }}
                  className="w-full text-left px-3.5 py-2 rounded-xl glass-card glass-card-hover text-xs text-[#A7ABB5] hover:text-white transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 truncate mr-2">
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/[0.08] text-white/80 border border-white/10">
                      {s.badge}
                    </span>
                    <span className="truncate">{s.title}</span>
                  </div>
                  <span className="text-[10px] text-[#FF5733] shrink-0 font-bold">Use</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-3">
            {isHost && (
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#FF5733] to-[#ff724d] hover:brightness-110 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-[#FF5733]/30 border border-white/20 active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Play Now
              </button>
            )}

            <button
              type="button"
              onClick={handleQueue}
              className={`${
                isHost ? "flex-1" : "w-full"
              } py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-white/[0.12] active:scale-95`}
            >
              <Plus className="w-3.5 h-3.5" />
              Add to Up Next
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
