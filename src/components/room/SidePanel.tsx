"use client";

import { useState } from "react";
import {
  MessageSquare,
  Users,
  ListVideo,
  X,
  Send,
  Mic,
  MicOff,
  Crown,
  Play,
  Trash2,
  Plus,
  Monitor,
} from "lucide-react";
import { Participant, ChatMessage, QueueItem } from "@/types/room";

interface SidePanelProps {
  activeTab: "chat" | "people" | "queue" | null;
  onClose: () => void;
  participants: Participant[];
  currentUserId: string;
  hostId: string;
  isHost: boolean;
  messages: ChatMessage[];
  onSendMessage: (msg: string) => void;
  queue: QueueItem[];
  onAddToQueue: (url: string) => void;
  onRemoveFromQueue: (id: string) => void;
  onPlayQueueItem: (item: QueueItem) => void;
  onTransferHost: (userId: string) => void;
  onQuickReaction: (emoji: string) => void;
}

const QUICK_REACTIONS = ["😂", "❤️", "😭", "🔥", "💀", "👀"];

export function SidePanel({
  activeTab,
  onClose,
  participants,
  currentUserId,
  hostId,
  isHost,
  messages,
  onSendMessage,
  queue,
  onAddToQueue,
  onRemoveFromQueue,
  onPlayQueueItem,
  onTransferHost,
  onQuickReaction,
}: SidePanelProps) {
  const [chatInput, setChatInput] = useState("");
  const [queueUrlInput, setQueueUrlInput] = useState("");

  if (!activeTab) return null;

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim());
    setChatInput("");
  };

  const handleAddQueue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queueUrlInput.trim()) return;
    onAddToQueue(queueUrlInput.trim());
    setQueueUrlInput("");
  };

  return (
    <aside className="w-full md:w-80 h-[50vh] md:h-full border-t md:border-t-0 md:border-l border-white/10 bg-[#111318] flex flex-col shrink-0 z-30 transition-all">
      {/* Panel Header */}
      <div className="h-12 border-b border-white/10 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {activeTab === "chat" && (
            <>
              <MessageSquare className="w-4 h-4 text-[#FF5733]" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">Chat</span>
            </>
          )}
          {activeTab === "people" && (
            <>
              <Users className="w-4 h-4 text-[#FF5733]" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                People ({participants.length})
              </span>
            </>
          )}
          {activeTab === "queue" && (
            <>
              <ListVideo className="w-4 h-4 text-[#FF5733]" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Up Next ({queue.length})
              </span>
            </>
          )}
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-y-auto">
        {/* --- CHAT TAB --- */}
        {activeTab === "chat" && (
          <div className="flex flex-col h-full justify-between">
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-[#6B7280] p-4">
                  <p className="text-xs">No messages yet.</p>
                  <p className="text-[11px] mt-1 text-[#A7ABB5]">Say hi to the party!</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.participant_id === currentUserId;
                  return (
                    <div key={m.id} className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs shrink-0 select-none">
                        {m.avatar || "🍿"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className={`text-xs font-semibold truncate ${
                              isMe ? "text-[#FF5733]" : "text-white/90"
                            }`}
                          >
                            {m.participant_name}
                          </span>
                          <span className="text-[9px] text-white/30">
                            {new Date(m.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-white/80 mt-0.5 break-words leading-relaxed">
                          {m.message}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Reactions strip */}
            <div className="px-3 py-1.5 border-t border-white/5 bg-[#0e1014] flex items-center justify-between">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onQuickReaction(emoji)}
                  className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center text-xs transition transform hover:scale-125 cursor-pointer active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="p-3 border-t border-white/10 bg-[#151820]">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Say something…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="w-full bg-[#08090B] border border-white/10 focus:border-[#FF5733] rounded-xl pl-3.5 pr-10 py-2 text-xs text-white placeholder-white/30 focus:outline-none transition"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="absolute right-1.5 p-1.5 rounded-lg text-[#FF5733] hover:text-[#ff6e4d] disabled:opacity-30 disabled:hover:text-[#FF5733] transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- PEOPLE TAB --- */}
        {activeTab === "people" && (
          <div className="p-3 space-y-2">
            {participants.map((p) => {
              const isPartyHost = p.user_id === hostId;
              const isMe = p.user_id === currentUserId;

              return (
                <div
                  key={p.user_id}
                  className={`p-2.5 rounded-xl border transition flex items-center justify-between ${
                    p.is_speaking
                      ? "bg-[#FF5733]/10 border-[#FF5733]/30"
                      : "bg-[#151820] border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar with speaking pulse */}
                    <div
                      className={`relative w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm select-none ${
                        p.is_speaking ? "ring-2 ring-[#FF5733] speaking-ring" : ""
                      }`}
                    >
                      {p.avatar || "🍿"}
                      {/* Status dot */}
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#111318]" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-white truncate">
                          {p.display_name}
                        </span>
                        {isMe && <span className="text-[10px] text-white/40">(You)</span>}
                        {isPartyHost && (
                          <span title="Host" className="text-amber-400">
                            <Crown className="w-3 h-3 fill-current" />
                          </span>
                        )}
                      </div>

                      {/* Presence status tags */}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {p.is_sharing && (
                          <span className="text-[10px] font-medium text-red-400 bg-red-400/10 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                            <span className="w-1 h-1 rounded-full bg-red-400 animate-ping" />
                            Sharing
                          </span>
                        )}
                        <span className="text-[10px] text-[#A7ABB5]">
                          {p.is_mic_muted ? "🔇 Muted" : "🎙 Unmuted"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Host Controls */}
                  <div className="flex items-center gap-1">
                    {isHost && !isPartyHost && (
                      <button
                        onClick={() => onTransferHost(p.user_id)}
                        className="text-[10px] text-white/60 hover:text-amber-400 bg-white/5 hover:bg-white/10 px-2 py-1 rounded transition cursor-pointer"
                        title="Make Room Host"
                      >
                        Make Host
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* --- QUEUE TAB --- */}
        {activeTab === "queue" && (
          <div className="flex flex-col h-full justify-between">
            <div className="p-3 space-y-2 overflow-y-auto">
              {queue.length === 0 ? (
                <div className="py-12 text-center text-[#6B7280]">
                  <p className="text-xs">No videos in queue.</p>
                  <p className="text-[11px] mt-1 text-[#A7ABB5]">
                    Add a YouTube link below to line up videos!
                  </p>
                </div>
              ) : (
                queue.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-[#151820] border border-white/5 hover:border-white/10 flex items-center justify-between gap-2 group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs font-mono text-white/30 w-5 shrink-0">
                        {String(idx + 1).padStart(2, "0")}
                      </span>

                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate max-w-[160px]">
                          {item.title}
                        </p>
                        <span className="text-[10px] text-[#A7ABB5]">
                          by {item.added_by}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isHost && (
                        <button
                          onClick={() => onPlayQueueItem(item)}
                          className="p-1.5 rounded-lg bg-[#FF5733]/15 text-[#FF5733] hover:bg-[#FF5733] hover:text-white transition cursor-pointer"
                          title="Play now"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                      )}

                      <button
                        onClick={() => onRemoveFromQueue(item.id)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-white/5 transition cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add to queue input */}
            <form onSubmit={handleAddQueue} className="p-3 border-t border-white/10 bg-[#151820]">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Paste YouTube link to queue…"
                  value={queueUrlInput}
                  onChange={(e) => setQueueUrlInput(e.target.value)}
                  className="w-full bg-[#08090B] border border-white/10 focus:border-[#FF5733] rounded-xl pl-3.5 pr-10 py-2 text-xs text-white placeholder-white/30 focus:outline-none transition"
                />
                <button
                  type="submit"
                  disabled={!queueUrlInput.trim()}
                  className="absolute right-1.5 p-1.5 rounded-lg text-[#FF5733] hover:text-[#ff6e4d] disabled:opacity-30 disabled:hover:text-[#FF5733] transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </aside>
  );
}
