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
  Volume2,
  VolumeX,
} from "lucide-react";

interface RoomControlsProps {
  isMicMuted: boolean;
  isCamMuted: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  activeTab: "chat" | "people" | "queue" | null;
  unreadCount?: number;
  queueCount?: number;
  soundEnabled?: boolean;
  isFloatingChatOpen?: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreenShare: () => void;
  onOpenAddMedia: () => void;
  onToggleTab: (tab: "chat" | "people" | "queue") => void;
  onOpenQR: () => void;
  onQuickReaction: (emoji: string) => void;
  onToggleSound?: () => void;
  onToggleFloatingChat?: () => void;
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
  soundEnabled = true,
  isFloatingChatOpen = false,
  onToggleMic,
  onToggleCam,
  onToggleScreenShare,
  onOpenAddMedia,
  onToggleTab,
  onOpenQR,
  onQuickReaction,
  onToggleSound,
  onToggleFloatingChat,
}: RoomControlsProps) {
  return (
    <div className="h-16 px-3 sm:px-6 flex items-center justify-between glass-dock shrink-0 z-30">
      {/* Left: AV Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Mic */}
        <button
          onClick={onToggleMic}
          className={`relative p-2.5 rounded-xl transition cursor-pointer flex items-center justify-center active:scale-95 ${
            isMicMuted
              ? "bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white border border-white/[0.08]"
              : isSpeaking
              ? "bg-[#FF5733] text-white shadow-lg shadow-[#FF5733]/40 ring-2 ring-[#FF5733]/60 animate-pulse border border-white/20"
              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm"
          }`}
          title={isMicMuted ? "Unmute Microphone" : "Mute Microphone"}
        >
          {isMicMuted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>

        {/* Camera */}
        <button
          onClick={onToggleCam}
          className={`p-2.5 rounded-xl transition cursor-pointer flex items-center justify-center active:scale-95 ${
            isCamMuted
              ? "bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white border border-white/[0.08]"
              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm"
          }`}
          title={isCamMuted ? "Turn on Camera" : "Turn off Camera"}
        >
          {isCamMuted ? <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Video className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>

        {/* Screen Share */}
        <button
          onClick={onToggleScreenShare}
          className={`p-2.5 rounded-xl transition cursor-pointer flex items-center justify-center active:scale-95 ${
            isScreenSharing
              ? "bg-[#FF5733] text-white shadow-lg shadow-[#FF5733]/30 border border-white/20"
              : "bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white border border-white/[0.08]"
          }`}
          title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
        >
          <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Watch Together */}
        <button
          onClick={onOpenAddMedia}
          className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white border border-white/[0.08] transition cursor-pointer flex items-center justify-center active:scale-95"
          title="Watch Together (Add/Change Video or Stream)"
        >
          <Film className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Center: Quick Floating Reaction Bar */}
      <div className="hidden lg:flex items-center gap-1 bg-black/30 backdrop-blur-xl border border-white/[0.08] p-1 rounded-xl shadow-inner">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onQuickReaction(emoji)}
            className="w-8 h-8 rounded-lg hover:bg-white/[0.12] flex items-center justify-center text-sm transition transform hover:scale-125 cursor-pointer active:scale-95"
            title={`React ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Right: Panels & Tools */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Sound FX Toggle */}
        {onToggleSound && (
          <button
            onClick={onToggleSound}
            className={`p-2 sm:p-2.5 rounded-xl transition cursor-pointer flex items-center justify-center active:scale-95 ${
              soundEnabled
                ? "text-white/70 hover:text-white hover:bg-white/[0.08] border border-transparent"
                : "text-white/30 bg-white/[0.04] border border-white/[0.06]"
            }`}
            title={soundEnabled ? "Mute Sound Effects" : "Enable Sound Effects"}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-white/70" />
            ) : (
              <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-red-400/80" />
            )}
          </button>
        )}

        {/* Floating Chat Overlay Toggle (Mobile & Cinema) */}
        {onToggleFloatingChat && (
          <button
            onClick={onToggleFloatingChat}
            className={`hidden sm:flex p-2 sm:p-2.5 rounded-xl transition cursor-pointer items-center justify-center active:scale-95 ${
              isFloatingChatOpen
                ? "bg-[#FF5733]/25 text-[#FF5733] border border-[#FF5733]/40 shadow-sm"
                : "bg-white/[0.05] hover:bg-white/[0.1] text-white/60 hover:text-white border border-white/[0.08]"
            }`}
            title="Toggle Live Stream Chat Overlay"
          >
            <span className="text-xs font-mono font-bold">LIVE</span>
          </button>
        )}

        {/* Queue */}
        <button
          onClick={() => onToggleTab("queue")}
          className={`relative p-2.5 rounded-xl transition cursor-pointer flex items-center justify-center active:scale-95 ${
            activeTab === "queue"
              ? "bg-white/[0.15] text-white border border-white/[0.2] shadow-inner"
              : "bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white border border-white/[0.08]"
          }`}
          title="Up Next Playlist"
        >
          <ListVideo className="w-4 h-4 sm:w-5 sm:h-5" />
          {queueCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF5733] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">
              {queueCount}
            </span>
          )}
        </button>

        {/* People */}
        <button
          onClick={() => onToggleTab("people")}
          className={`p-2.5 rounded-xl transition cursor-pointer flex items-center justify-center active:scale-95 ${
            activeTab === "people"
              ? "bg-white/[0.15] text-white border border-white/[0.2] shadow-inner"
              : "bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white border border-white/[0.08]"
          }`}
          title="Participants"
        >
          <Users className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Chat */}
        <button
          onClick={() => onToggleTab("chat")}
          className={`relative p-2.5 rounded-xl transition cursor-pointer flex items-center justify-center active:scale-95 ${
            activeTab === "chat"
              ? "bg-white/[0.15] text-white border border-white/[0.2] shadow-inner"
              : "bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white border border-white/[0.08]"
          }`}
          title="Chat"
        >
          <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">
              {unreadCount}
            </span>
          )}
        </button>

        {/* QR for 2nd device (Mobile) */}
        <button
          onClick={onOpenQR}
          className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white border border-white/[0.08] transition cursor-pointer flex items-center justify-center sm:hidden active:scale-95"
          title="2nd Device QR"
        >
          <QrCode className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
