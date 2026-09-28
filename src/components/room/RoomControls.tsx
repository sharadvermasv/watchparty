"use client";

import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Film,
  MessageSquare,
  Users,
  ListVideo,
  QrCode,
  Smile,
} from "lucide-react";

interface RoomControlsProps {
  isMicMuted: boolean;
  isCamMuted: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  activeTab: "chat" | "people" | "queue" | null;
  unreadCount?: number;
  queueCount?: number;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreenShare: () => void;
  onOpenAddMedia: () => void;
  onToggleTab: (tab: "chat" | "people" | "queue") => void;
  onOpenQR: () => void;
  onQuickReaction: (emoji: string) => void;
}

const QUICK_REACTIONS = ["😂", "❤️", "😭", "🔥", "💀", "👀"];

export function RoomControls({
  isMicMuted,
  isCamMuted,
  isScreenSharing,
  isSpeaking,
  activeTab,
  unreadCount = 0,
  queueCount = 0,
  onToggleMic,
  onToggleCam,
  onToggleScreenShare,
  onOpenAddMedia,
  onToggleTab,
  onOpenQR,
  onQuickReaction,
}: RoomControlsProps) {
  return (
    <div className="h-16 border-t border-white/10 px-4 md:px-6 flex items-center justify-between bg-[#111318]/90 backdrop-blur-xl shrink-0 z-30">
      {/* Left: AV Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mic */}
        <button
          onClick={onToggleMic}
          className={`relative p-2.5 rounded-xl transition cursor-pointer flex items-center justify-center ${
            isMicMuted
              ? "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
              : isSpeaking
              ? "bg-[#FF5733] text-white shadow-lg shadow-[#FF5733]/30 ring-2 ring-[#FF5733]/50 animate-pulse"
              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
          }`}
          title={isMicMuted ? "Unmute Microphone" : "Mute Microphone"}
        >
          {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Camera */}
        <button
          onClick={onToggleCam}
          className={`p-2.5 rounded-xl transition cursor-pointer flex items-center justify-center ${
            isCamMuted
              ? "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
          }`}
          title={isCamMuted ? "Turn on Camera" : "Turn off Camera"}
        >
          {isCamMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        {/* Screen Share */}
        <button
          onClick={onToggleScreenShare}
          className={`p-2.5 rounded-xl transition cursor-pointer flex items-center justify-center ${
            isScreenSharing
              ? "bg-[#FF5733] text-white shadow-lg shadow-[#FF5733]/25"
              : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
          }`}
          title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
        >
          <Monitor className="w-5 h-5" />
        </button>

        {/* Watch Together */}
        <button
          onClick={onOpenAddMedia}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer flex items-center justify-center"
          title="Watch Together (Add/Change Video)"
        >
          <Film className="w-5 h-5" />
        </button>
      </div>

      {/* Center: Quick Floating Reaction Bar */}
      <div className="hidden lg:flex items-center gap-1 bg-[#151820] border border-white/5 p-1 rounded-xl">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onQuickReaction(emoji)}
            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-sm transition transform hover:scale-125 cursor-pointer active:scale-95"
            title={`React ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Right: Panels & Tools */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Queue */}
        <button
          onClick={() => onToggleTab("queue")}
          className={`relative p-2.5 rounded-xl transition cursor-pointer flex items-center justify-center ${
            activeTab === "queue"
              ? "bg-white/15 text-white"
              : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
          }`}
          title="Up Next Playlist"
        >
          <ListVideo className="w-5 h-5" />
          {queueCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF5733] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {queueCount}
            </span>
          )}
        </button>

        {/* People */}
        <button
          onClick={() => onToggleTab("people")}
          className={`p-2.5 rounded-xl transition cursor-pointer flex items-center justify-center ${
            activeTab === "people"
              ? "bg-white/15 text-white"
              : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
          }`}
          title="Participants"
        >
          <Users className="w-5 h-5" />
        </button>

        {/* Chat */}
        <button
          onClick={() => onToggleTab("chat")}
          className={`relative p-2.5 rounded-xl transition cursor-pointer flex items-center justify-center ${
            activeTab === "chat"
              ? "bg-white/15 text-white"
              : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
          }`}
          title="Chat"
        >
          <MessageSquare className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {/* QR for 2nd device */}
        <button
          onClick={onOpenQR}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer flex items-center justify-center sm:hidden"
          title="2nd Device QR"
        >
          <QrCode className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
