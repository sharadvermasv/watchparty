"use client";

import { useState } from "react";
import { WatchState, FloatingReaction, ChatMessage } from "@/types/room";
import { YouTubePlayer } from "@/components/video/YouTubePlayer";
import { WebVideoPlayer } from "@/components/video/WebVideoPlayer";
import { ScreenShareViewer } from "@/components/video/ScreenShareViewer";
import { detectMediaType } from "@/lib/sync/driftCalculator";
import { Film, Monitor, Copy, Check, Sparkles, MessageSquare, X } from "lucide-react";

interface RoomStageProps {
  watchState: WatchState;
  isHost: boolean;
  roomCode: string;
  onUpdateWatchState: (updates: Partial<WatchState>) => void;
  onOpenAddMedia: () => void;
  onStartScreenShare: () => void;
  onStopScreenShare: () => void;
  screenStream: MediaStream | null;
  isLocallySharing?: boolean;
  floatingReactions: FloatingReaction[];
  toastMessage: string | null;
  onVideoEnded?: () => void;
  messages?: ChatMessage[];
  isFloatingChatOpen?: boolean;
  onToggleFloatingChat?: () => void;
  onSeekTimestamp?: (seconds: number) => void;
}

export function RoomStage({
  watchState,
  isHost,
  roomCode,
  onUpdateWatchState,
  onOpenAddMedia,
  onStartScreenShare,
  onStopScreenShare,
  screenStream,
  isLocallySharing = false,
  floatingReactions,
  toastMessage,
  onVideoEnded,
  messages = [],
  isFloatingChatOpen = false,
  onToggleFloatingChat,
  onSeekTimestamp,
}: RoomStageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/r/${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const recentMessages = messages.slice(-5);
  const mediaType = detectMediaType(watchState.media_url || "");

  return (
    <div className="relative flex-1 w-full h-full bg-[#07080b]/50 flex items-center justify-center overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-6 z-50 glass-dock text-white px-4 py-2 rounded-full text-xs font-medium shadow-2xl flex items-center gap-2 animate-fade-in border border-white/20">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Reactions Layer */}
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
        {floatingReactions.map((rx) => (
          <div
            key={rx.id}
            className="reaction-bubble flex flex-col items-center"
            style={{
              left: `${rx.xPercent}%`,
              bottom: "12%",
            }}
          >
            <span className="text-4xl filter drop-shadow-lg">{rx.emoji}</span>
            <span className="text-[10px] font-semibold text-white/90 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 shadow-lg mt-1">
              {rx.senderName}
            </span>
          </div>
        ))}
      </div>

      {/* Floating Live Stream Chat Overlay (Mobile & Cinema mode) */}
      {isFloatingChatOpen && recentMessages.length > 0 && (
        <div className="absolute bottom-20 left-4 z-40 max-w-[280px] sm:max-w-xs pointer-events-auto flex flex-col gap-1.5 animate-fade-in">
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-black/60 backdrop-blur-xl rounded-t-xl border border-white/10 text-[10px] text-white/70">
            <span className="flex items-center gap-1 font-semibold">
              <MessageSquare className="w-3 h-3 text-[#FF5733]" /> Live Stream Chat
            </span>
            {onToggleFloatingChat && (
              <button
                onClick={onToggleFloatingChat}
                className="hover:text-white transition cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {recentMessages.map((m) => (
              <div
                key={m.id}
                className="bg-black/65 backdrop-blur-xl border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl animate-fade-in"
              >
                <span className="font-bold text-[#FF5733] mr-1.5">{m.participant_name}:</span>
                <span className="text-white/95">{m.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mode A: Watch Together (YouTube or Universal HLS/MP4 Web Video) */}
      {watchState.mode === "watch" && watchState.media_url ? (
        mediaType === "youtube" ? (
          <YouTubePlayer
            watchState={watchState}
            isHost={isHost}
            onUpdateWatchState={onUpdateWatchState}
            onVideoEnded={onVideoEnded}
          />
        ) : (
          <WebVideoPlayer
            watchState={watchState}
            isHost={isHost}
            onUpdateWatchState={onUpdateWatchState}
            onVideoEnded={onVideoEnded}
          />
        )
      ) : watchState.mode === "screen" ? (
        /* Mode B: Screen Share */
        <ScreenShareViewer
          isSharing={Boolean(screenStream)}
          isHost={isHost}
          isLocallySharing={isLocallySharing}
          onStartShare={onStartScreenShare}
          onStopShare={onStopScreenShare}
          stream={screenStream}
        />
      ) : (
        /* Empty Room State - High End Frosted Glass Card */
        <div className="max-w-md w-full p-8 mx-4 text-center flex flex-col items-center glass-panel rounded-3xl border border-white/[0.14] shadow-[0_25px_60px_rgba(0,0,0,0.6)] animate-fade-in">
          <div className="relative mb-5">
            <div className="absolute -inset-2 bg-gradient-to-r from-[#FF5733] to-[#8B5CF6] rounded-2xl blur-lg opacity-60 animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/25 flex items-center justify-center shadow-xl">
              <Sparkles className="w-8 h-8 text-[#FF5733]" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
            Your room is ready.
          </h2>
          <p className="text-xs sm:text-sm text-[#A7ABB5] leading-relaxed mb-6">
            Invite your friends and start watching synchronized videos or sharing your screen.
          </p>

          {/* Quick invite link */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.12] backdrop-blur-md border border-white/[0.14] text-white/90 hover:text-white px-4 py-2 rounded-xl text-xs font-semibold mb-7 transition cursor-pointer shadow-md active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Link Copied!" : "Copy Invite Link"}</span>
          </button>

          {/* Action triggers */}
          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              onClick={onOpenAddMedia}
              className="flex flex-col items-center justify-center p-4 rounded-2xl glass-card glass-card-hover group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-[#FF5733]/20 border border-[#FF5733]/30 text-[#FF5733] flex items-center justify-center mb-2 group-hover:scale-105 transition shadow-sm">
                <Film className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-white">Watch Together</span>
              <span className="text-[10px] text-[#A7ABB5] mt-0.5">YouTube, HLS & MP4</span>
            </button>

            <button
              onClick={onStartScreenShare}
              className="flex flex-col items-center justify-center p-4 rounded-2xl glass-card glass-card-hover group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 text-[#8B5CF6] flex items-center justify-center mb-2 group-hover:scale-105 transition shadow-sm">
                <Monitor className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-white">Share Screen</span>
              <span className="text-[10px] text-[#A7ABB5] mt-0.5">Tab, Window, App</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
