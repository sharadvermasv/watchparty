"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, LogIn, ArrowRight } from "lucide-react";
import { saveUserSession, getUserSession, AVATAR_OPTIONS } from "@/lib/session";

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoinRoomModal({ isOpen, onClose }: JoinRoomModalProps) {
  const router = useRouter();
  const existingSession = typeof window !== "undefined" ? getUserSession() : null;

  const [inputCode, setInputCode] = useState("");
  const [displayName, setDisplayName] = useState(existingSession?.displayName || "");
  const [selectedAvatar, setSelectedAvatar] = useState(existingSession?.avatar || "🦊");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let cleaned = inputCode.trim();

    if (cleaned.includes("/r/")) {
      const parts = cleaned.split("/r/");
      cleaned = parts[parts.length - 1];
    }
    cleaned = cleaned.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

    if (!cleaned || cleaned.length < 3) {
      setError("Please enter a valid room code.");
      return;
    }

    const finalUserName = displayName.trim() || existingSession?.displayName || "Guest";

    saveUserSession({
      userId: existingSession?.userId || ("usr_" + Math.random().toString(36).substring(2, 9)),
      displayName: finalUserName,
      avatar: selectedAvatar,
    });

    router.push(`/r/${cleaned}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md glass-panel rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.7)] border border-white/[0.14]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-white/[0.08] border border-white/[0.12] text-white flex items-center justify-center shadow-lg">
            <LogIn className="w-5 h-5 text-[#FF5733]" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Join a Room</h3>
            <p className="text-xs text-[#A7ABB5]">Enter the 6-character room code</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-1.5">
              Room Code or URL
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 7K4XM2"
              value={inputCode}
              onChange={(e) => {
                setInputCode(e.target.value);
                setError(null);
              }}
              className="w-full glass-input rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-white/30 uppercase tracking-wider font-mono focus:outline-none transition"
              autoFocus
            />
            {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-1.5">
              Your Name
            </label>
            <input
              type="text"
              required
              placeholder="Enter your nickname"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full glass-input rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-white/30 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
              Choose Avatar
            </label>
            <div className="flex items-center justify-between gap-1.5">
              {AVATAR_OPTIONS.map((av) => (
                <button
                  type="button"
                  key={av}
                  onClick={() => setSelectedAvatar(av)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition cursor-pointer active:scale-90 ${
                    selectedAvatar === av
                      ? "bg-white/[0.2] border-2 border-[#FF5733] shadow-md shadow-[#FF5733]/30 scale-105"
                      : "bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08]"
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF5733] to-[#ff724d] hover:brightness-110 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#FF5733]/30 transition flex items-center justify-center gap-2 cursor-pointer border border-white/20 active:scale-95"
            >
              <span>Join Room</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
