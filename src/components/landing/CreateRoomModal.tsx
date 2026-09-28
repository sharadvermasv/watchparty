"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Sparkles, Lock, Globe, ArrowRight } from "lucide-react";
import { generateRoomCode, saveUserSession, getUserSession, AVATAR_OPTIONS } from "@/lib/session";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateRoomModal({ isOpen, onClose }: CreateRoomModalProps) {
  const router = useRouter();
  const existingSession = typeof window !== "undefined" ? getUserSession() : null;

  const [roomName, setRoomName] = useState("Friday Night");
  const [displayName, setDisplayName] = useState(existingSession?.displayName || "");
  const [selectedAvatar, setSelectedAvatar] = useState(existingSession?.avatar || "🍿");
  const [isPrivate, setIsPrivate] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const roomCode = generateRoomCode();
    const finalName = roomName.trim() || "Friday Night";
    const finalUserName = displayName.trim() || existingSession?.displayName || "Guest";

    // Save session
    saveUserSession({
      userId: existingSession?.userId || ("usr_" + Math.random().toString(36).substring(2, 9)),
      displayName: finalUserName,
      avatar: selectedAvatar,
    });

    // Save initial room data locally so it hydrates immediately
    try {
      localStorage.setItem(
        `wp_room_${roomCode}`,
        JSON.stringify({
          id: `rm_${roomCode}`,
          room_code: roomCode,
          name: finalName,
          host_id: existingSession?.userId || "usr_creator",
          is_private: isPrivate,
          created_at: new Date().toISOString(),
        })
      );
    } catch {}

    router.push(`/r/${roomCode}`);
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
          <div className="w-10 h-10 rounded-xl bg-[#FF5733]/20 border border-[#FF5733]/30 text-[#FF5733] flex items-center justify-center shadow-lg shadow-[#FF5733]/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Create a Room</h3>
            <p className="text-xs text-[#A7ABB5]">Set up your watch room in seconds</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Room Name */}
          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-1.5">
              Room Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Friday Movie Night"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full glass-input rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-white/30 focus:outline-none transition"
            />
          </div>

          {/* Your Name */}
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

          {/* Avatar Selection */}
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

          {/* Privacy Toggle */}
          <div className="pt-1">
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                {isPrivate ? (
                  <Lock className="w-4 h-4 text-[#FF5733]" />
                ) : (
                  <Globe className="w-4 h-4 text-emerald-400" />
                )}
                <div>
                  <span className="text-xs font-semibold text-white block">
                    {isPrivate ? "Private Room" : "Open Room"}
                  </span>
                  <span className="text-[10px] text-[#A7ABB5] block">
                    {isPrivate ? "Only people with the invite link can join" : "Anyone can join"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrivate(!isPrivate)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  isPrivate ? "bg-[#FF5733]" : "bg-white/20"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                    isPrivate ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF5733] to-[#ff724d] hover:brightness-110 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#FF5733]/30 transition flex items-center justify-center gap-2 cursor-pointer border border-white/20 active:scale-95 disabled:opacity-50"
            >
              <span>{isSubmitting ? "Creating…" : "Enter Cinema"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
