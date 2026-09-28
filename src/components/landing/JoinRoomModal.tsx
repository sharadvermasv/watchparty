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

    // If user pasted a full URL like https://watchparty.app/r/7K4XM2 or /r/7K4XM2
    if (cleaned.includes("/r/")) {
      const parts = cleaned.split("/r/");
      cleaned = parts[parts.length - 1];
    }
    // Strip trailing slashes or queries
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#151820] border border-white/10 rounded-2xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center">
            <LogIn className="w-5 h-5" />
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
                setInputCode(e.target.value.toUpperCase());
                setError(null);
              }}
              className="w-full bg-[#08090B] border border-white/10 focus:border-[#FF5733] rounded-xl px-4 py-2.5 text-sm font-mono tracking-wider text-white placeholder-white/30 focus:outline-none transition"
              autoFocus
            />
            {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-1.5">
              Your name <span className="text-white/40 normal-case">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Alex"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-[#08090B] border border-white/10 focus:border-[#FF5733] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-1.5">
              Choose an Avatar
            </label>
            <div className="flex flex-wrap gap-2 bg-[#08090B] p-2.5 rounded-xl border border-white/10">
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedAvatar(emoji)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition cursor-pointer ${
                    selectedAvatar === emoji
                      ? "bg-[#FF5733]/25 border border-[#FF5733] scale-110"
                      : "hover:bg-white/10 border border-transparent"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-white hover:bg-white/90 text-black font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-white/5"
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
