"use client";

import { Users, Share2, QrCode, Crown } from "lucide-react";
import Link from "next/link";

interface RoomHeaderProps {
  roomName: string;
  roomCode: string;
  participantCount: number;
  isHost: boolean;
  onOpenInvite: () => void;
  onOpenQR: () => void;
}

export function RoomHeader({
  roomName,
  roomCode,
  participantCount,
  isHost,
  onOpenInvite,
  onOpenQR,
}: RoomHeaderProps) {
  return (
    <header className="h-14 border-b border-white/[0.08] px-4 md:px-6 flex items-center justify-between bg-[#0c0e14]/75 backdrop-blur-2xl shrink-0 z-30 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
      {/* Brand & Room Info */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FF5733] to-[#ff7e47] flex items-center justify-center text-white shadow-md shadow-[#FF5733]/30 group-hover:scale-105 transition border border-white/20">
            <span className="text-xs font-black tracking-tighter">WP</span>
          </div>
          <span className="font-extrabold text-xs tracking-wider uppercase text-white/90 hidden sm:inline group-hover:text-white transition">
            Watch Party
          </span>
        </Link>

        <span className="text-white/20 text-xs hidden sm:inline">/</span>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white/90 truncate max-w-[120px] sm:max-w-[200px]">
            {roomName}
          </span>
          <span className="text-[10px] font-mono uppercase bg-white/[0.06] backdrop-blur-md border border-white/[0.12] px-2 py-0.5 rounded-md text-[#A7ABB5] shadow-inner">
            {roomCode}
          </span>
          {isHost && (
            <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/25 px-2 py-0.5 rounded-full shadow-sm">
              <Crown className="w-2.5 h-2.5 fill-current" />
              Host
            </span>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Participant Count Pill */}
        <div className="flex items-center gap-1.5 text-xs text-[#A7ABB5] bg-white/[0.05] backdrop-blur-md border border-white/[0.12] px-2.5 py-1 rounded-lg shadow-sm">
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold text-white">{participantCount}</span>
        </div>

        {/* 2nd device quick join */}
        <button
          onClick={onOpenQR}
          className="p-1.5 text-white/70 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] backdrop-blur-md border border-white/[0.12] rounded-lg transition cursor-pointer shadow-sm active:scale-95"
          title="Join this room on 2nd device / Phone QR"
        >
          <QrCode className="w-4 h-4" />
        </button>

        {/* Share Button */}
        <button
          onClick={onOpenInvite}
          className="flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-[#FF5733] to-[#ff724d] hover:brightness-110 text-white px-3.5 py-1.5 rounded-lg shadow-md shadow-[#FF5733]/30 transition cursor-pointer border border-white/20 active:scale-95"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Share</span>
        </button>
      </div>
    </header>
  );
}
