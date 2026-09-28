"use client";

import { Users, Share2, QrCode, Crown, Shield } from "lucide-react";
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
    <header className="h-14 border-b border-white/10 px-4 md:px-6 flex items-center justify-between bg-[#08090B] shrink-0 z-30">
      {/* Brand & Room Info */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-[#FF5733] flex items-center justify-center text-white shadow-md shadow-[#FF5733]/25 group-hover:scale-105 transition">
            <span className="text-xs font-black tracking-tighter">WP</span>
          </div>
          <span className="font-bold text-sm tracking-wider uppercase text-white/90 hidden sm:inline group-hover:text-white transition">
            Watch Party
          </span>
        </Link>

        <span className="text-white/20 text-xs hidden sm:inline">/</span>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white truncate max-w-[120px] sm:max-w-[200px]">
            {roomName}
          </span>
          <span className="text-[10px] font-mono uppercase bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[#A7ABB5]">
            {roomCode}
          </span>
          {isHost && (
            <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
              <Crown className="w-2.5 h-2.5" />
              Host
            </span>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Participant Count */}
        <div className="flex items-center gap-1.5 text-xs text-[#A7ABB5] bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-medium text-white">{participantCount}</span>
        </div>

        {/* 2nd device quick join */}
        <button
          onClick={onOpenQR}
          className="p-1.5 text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition cursor-pointer"
          title="Join this room on 2nd device / Phone QR"
        >
          <QrCode className="w-4 h-4" />
        </button>

        {/* Share Button */}
        <button
          onClick={onOpenInvite}
          className="flex items-center gap-1.5 text-xs font-semibold bg-[#FF5733] hover:bg-[#ff6e4d] text-white px-3.5 py-1.5 rounded-lg shadow-md shadow-[#FF5733]/20 transition cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Share</span>
        </button>
      </div>
    </header>
  );
}
