"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Film,
  Monitor,
  Users,
  QrCode,
  ArrowRight,
  Play,
  Sparkles,
  ShieldCheck,
  Zap,
  Volume2,
} from "lucide-react";
import { CreateRoomModal } from "@/components/landing/CreateRoomModal";
import { JoinRoomModal } from "@/components/landing/JoinRoomModal";

export default function LandingPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#07080b] text-white flex flex-col relative selection:bg-[#FF5733] selection:text-white overflow-hidden">
      {/* Ambient glowing glassmorphism orbs in background */}
      <div className="ambient-bg">
        <div className="ambient-orb-coral" />
        <div className="ambient-orb-violet" />
        <div className="ambient-orb-cyan" />
      </div>

      {/* Navigation */}
      <nav className="relative z-40 border-b border-white/[0.08] bg-[#0c0e14]/60 backdrop-blur-2xl sticky top-0 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF5733] to-[#ff7e47] flex items-center justify-center text-white font-black text-xs shadow-lg shadow-[#FF5733]/40 border border-white/20">
              WP
            </div>
            <span className="font-extrabold text-base tracking-wider uppercase text-white/90">
              Watch Party
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsJoinOpen(true)}
              className="text-xs font-semibold text-white/70 hover:text-white px-4 py-2 rounded-xl transition cursor-pointer hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08]"
            >
              Join a Room
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="text-xs font-bold bg-gradient-to-r from-[#FF5733] to-[#ff6e4d] hover:brightness-110 text-white px-4 py-2 rounded-xl shadow-lg shadow-[#FF5733]/30 transition cursor-pointer border border-white/20 active:scale-95"
            >
              Create a Room
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-20 px-6 max-w-6xl mx-auto text-center flex flex-col items-center">
        {/* Subtle pill tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] backdrop-blur-xl border border-white/[0.12] text-xs text-[#A7ABB5] mb-6 shadow-lg shadow-black/20">
          <span className="w-2 h-2 rounded-full bg-[#FF5733] animate-pulse" />
          <span className="font-medium">Synchronized YouTube, HLS, Web Video & Screen Share</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.08] mb-6">
          Watch anything. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/95 to-[#FF5733]">
            Together.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-[#A7ABB5] max-w-xl leading-relaxed mb-10">
          Create a private room, invite your friends, and watch videos or share your screen in frame-accurate sync — on both desktop and mobile.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 mb-16 w-full sm:w-auto">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#FF5733] to-[#ff724d] hover:brightness-110 text-white font-bold text-sm shadow-xl shadow-[#FF5733]/35 transition flex items-center justify-center gap-2 cursor-pointer border border-white/25 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Create a Room</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsJoinOpen(true)}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] backdrop-blur-xl border border-white/[0.14] text-white font-semibold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-black/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Join a Room</span>
          </button>
        </div>

        {/* Atmospheric Cinematic Preview Visual */}
        <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden glass-panel border border-white/[0.14] shadow-2xl">
          {/* Mock Video Canvas */}
          <div className="relative aspect-video bg-gradient-to-tr from-[#0a0c10]/90 via-[#12151e]/80 to-[#191d29]/80 flex items-center justify-center overflow-hidden">
            {/* Ambient lighting glow inside preview */}
            <div className="absolute -top-32 -left-32 w-80 h-80 bg-[#FF5733]/25 rounded-full blur-[90px] pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-[#8B5CF6]/25 rounded-full blur-[90px] pointer-events-none" />

            {/* Mock Floating Participant Video Avatar Badges */}
            <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
              <div className="glass-card px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-white/90">Movie Night</span>
              </div>
            </div>

            <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 border-2 border-[#151820] flex items-center justify-center text-xs shadow-md">
                  🍿
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 border-2 border-[#151820] flex items-center justify-center text-xs shadow-md">
                  🎬
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 border-2 border-[#151820] flex items-center justify-center text-xs shadow-md">
                  🍕
                </div>
              </div>
            </div>

            {/* Play Button */}
            <div className="w-20 h-20 rounded-full bg-white/[0.08] backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl transition transform hover:scale-105 group cursor-pointer">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FF5733] to-[#ff724d] flex items-center justify-center text-white shadow-lg shadow-[#FF5733]/50">
                <Play className="w-6 h-6 fill-current ml-1" />
              </div>
            </div>

            {/* Mock Scrubber bar at bottom */}
            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col gap-2">
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="w-1/3 h-full bg-[#FF5733] rounded-full" />
              </div>
              <div className="flex items-center justify-between text-[11px] text-white/70 font-mono">
                <span>01:14:20</span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  3 Watching • Synced
                </span>
                <span>02:30:00</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="relative z-10 py-20 px-6 max-w-6xl mx-auto border-t border-white/[0.08]">
        <div className="text-center max-w-xl mx-auto mb-14">
          <h2 className="text-xs uppercase font-extrabold tracking-widest text-[#FF5733] mb-2">
            Engineered For Social Watching
          </h2>
          <p className="text-2xl sm:text-3xl font-extrabold text-white">
            Everything you need for movie nights with friends.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="glass-card glass-card-hover p-6 rounded-2xl flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF5733]/20 to-[#FF5733]/5 border border-[#FF5733]/30 text-[#FF5733] flex items-center justify-center mb-5 shadow-lg">
              <Film className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Universal Watch Together</h3>
            <p className="text-xs text-[#A7ABB5] leading-relaxed">
              Synchronize YouTube videos, HLS (.m3u8) feeds, and direct MP4 movies with millisecond drift correction and auto-queue.
            </p>
          </div>

          {/* Card 2 */}
          <div className="glass-card glass-card-hover p-6 rounded-2xl flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8B5CF6]/20 to-[#8B5CF6]/5 border border-[#8B5CF6]/30 text-[#8B5CF6] flex items-center justify-center mb-5 shadow-lg">
              <Monitor className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Native WebRTC Screen Share</h3>
            <p className="text-xs text-[#A7ABB5] leading-relaxed">
              Share any browser tab, app window, or your whole desktop with high quality audio and peer-to-peer transmission.
            </p>
          </div>

          {/* Card 3 */}
          <div className="glass-card glass-card-hover p-6 rounded-2xl flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-5 shadow-lg">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Two-Device QR Pairing</h3>
            <p className="text-xs text-[#A7ABB5] leading-relaxed">
              Streaming on your laptop while chilling on your phone? Scan the instant room QR code to seamlessly join on a 2nd screen.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.08] py-8 text-center text-xs text-[#A7ABB5]/70 bg-black/30 backdrop-blur-md">
        <p>© 2026 Watch Party. Built for watching together.</p>
      </footer>

      {/* Modals */}
      <CreateRoomModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      <JoinRoomModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
      />
    </div>
  );
}
