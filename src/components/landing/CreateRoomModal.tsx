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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#151820] border border-white/10 rounded-2xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#FF5733]/15 text-[#FF5733] flex items-center justify-center">
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
              Room name
            </label>
            <input
              type="text"
              required
              placeholder="Friday Night"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full bg-[#08090B] border border-white/10 focus:border-[#FF5733] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none transition"
              autoFocus
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-1.5">
              Your name <span className="text-white/40 normal-case">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Sharad"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-[#08090B] border border-white/10 focus:border-[#FF5733] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none transition"
            />
          </div>

          {/* Avatar Selector */}
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

          {/* Privacy */}
          <div>
            <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
              Privacy
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                  isPrivate
                    ? "bg-[#FF5733]/10 border-[#FF5733]/40 text-white"
                    : "bg-[#08090B] border-white/10 text-white/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <Lock className="w-3.5 h-3.5 text-[#FF5733]" />
                  <span>Private</span>
                </div>
                <span className="text-[11px] text-[#A7ABB5]">Invite only with link</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                  !isPrivate
                    ? "bg-[#FF5733]/10 border-[#FF5733]/40 text-white"
                    : "bg-[#08090B] border-white/10 text-white/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Anyone</span>
                </div>
                <span className="text-[11px] text-[#A7ABB5]">Open room link</span>
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-[#FF5733] hover:bg-[#ff6e4d] text-white font-bold text-sm shadow-xl shadow-[#FF5733]/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isSubmitting ? "Creating Room…" : "Create Room"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
