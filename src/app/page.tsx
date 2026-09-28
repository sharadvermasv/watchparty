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
    <div className="min-h-screen bg-[#08090B] text-white flex flex-col selection:bg-[#FF5733] selection:text-white">
      {/* Navigation */}
      <nav className="border-b border-white/5 bg-[#08090B]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF5733] flex items-center justify-center text-white font-black text-xs shadow-lg shadow-[#FF5733]/30">
              WP
            </div>
            <span className="font-extrabold text-base tracking-wider uppercase">
              Watch Party
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsJoinOpen(true)}
              className="text-xs font-semibold text-white/70 hover:text-white px-3.5 py-2 rounded-xl transition cursor-pointer"
            >
              Join a Room
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="text-xs font-bold bg-[#FF5733] hover:bg-[#ff6e4d] text-white px-4 py-2 rounded-xl shadow-lg shadow-[#FF5733]/25 transition cursor-pointer"
            >
              Create a Room
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-16 pb-20 px-6 max-w-6xl mx-auto text-center flex flex-col items-center">
        {/* Subtle pill tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-[#A7ABB5] mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF5733] animate-pulse" />
          <span>Synchronized videos & instant screen sharing</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.08] mb-6">
          Watch anything. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-[#FF5733]">
            Together.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-[#A7ABB5] max-w-xl leading-relaxed mb-10">
          Create a private room, invite your friends, and watch videos together — wherever everyone is.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 mb-16">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#FF5733] hover:bg-[#ff6e4d] text-white font-bold text-sm shadow-xl shadow-[#FF5733]/30 transition flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Create a Room</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsJoinOpen(true)}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#151820] hover:bg-[#1c202a] border border-white/10 hover:border-white/20 text-white font-semibold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Join a Room</span>
          </button>
        </div>

        {/* Atmospheric Cinematic Preview Visual */}
        <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#111318]">
          {/* Mock Video Canvas */}
          <div className="relative aspect-video bg-gradient-to-tr from-[#0a0c10] via-[#151820] to-[#1f2430] flex items-center justify-center overflow-hidden">
            {/* Ambient lighting glow */}
            <div className="absolute -top-32 -left-32 w-80 h-80 bg-[#FF5733]/20 rounded-full blur-[90px] pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-[#8B5CF6]/20 rounded-full blur-[90px] pointer-events-none" />

            {/* Mock cinematic content */}
            <div className="text-center z-10 p-6">
              <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white mx-auto mb-3 shadow-xl">
                <Play className="w-6 h-6 fill-current ml-0.5" />
              </div>
              <h4 className="text-base font-bold text-white tracking-wide">
                Interstellar — 10th Anniversary Trailer
              </h4>
              <p className="text-xs text-[#A7ABB5] mt-1 font-mono">42:17 / 1:32:00</p>
            </div>

            {/* Top Left: 3 people watching pill */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium text-white/90">3 people watching</span>
            </div>

            {/* Floating avatars around video */}
            {/* Sharad */}
            <div className="absolute bottom-16 left-6 z-20 bg-[#151820]/90 backdrop-blur-md border border-[#FF5733]/40 rounded-xl px-2.5 py-1.5 flex items-center gap-2 shadow-xl animate-bounce" style={{ animationDuration: "3s" }}>
              <span className="text-sm">🍿</span>
              <div>
                <p className="text-[11px] font-bold text-white leading-none">Sharad</p>
                <span className="text-[9px] text-[#FF5733] font-medium">Host</span>
              </div>
            </div>

            {/* Alex */}
            <div className="absolute top-12 right-8 z-20 bg-[#151820]/90 backdrop-blur-md border border-white/10 rounded-xl px-2.5 py-1.5 flex items-center gap-2 shadow-xl animate-pulse">
              <span className="text-sm">🎬</span>
              <div>
                <p className="text-[11px] font-bold text-white leading-none">Alex</p>
                <span className="text-[9px] text-emerald-400 font-medium">Synced</span>
              </div>
            </div>

            {/* Rahul */}
            <div className="absolute bottom-20 right-10 z-20 bg-[#151820]/90 backdrop-blur-md border border-white/10 rounded-xl px-2.5 py-1.5 flex items-center gap-2 shadow-xl">
              <span className="text-sm">🚀</span>
              <div>
                <p className="text-[11px] font-bold text-white leading-none">Rahul</p>
                <span className="text-[9px] text-white/50">Listening</span>
              </div>
            </div>

            {/* Floating reactions simulation */}
            <div className="absolute bottom-28 left-20 z-20 text-3xl animate-bounce" style={{ animationDuration: "2.2s" }}>
              😂
            </div>
            <div className="absolute top-24 left-1/3 z-20 text-2xl animate-pulse" style={{ animationDuration: "1.8s" }}>
              🔥
            </div>
            <div className="absolute bottom-24 right-1/4 z-20 text-3xl animate-bounce" style={{ animationDuration: "2.6s" }}>
              💀
            </div>

            {/* Mock playback scrubber bar */}
            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
              <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                <div className="w-[45%] h-full bg-[#FF5733]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 border-t border-white/5 bg-[#0b0d11]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold text-[#FF5733] uppercase tracking-widest">
              Simple 3-Step Flow
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              How it works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#151820] border border-white/5 relative">
              <span className="text-3xl font-black text-white/10 absolute top-4 right-4">01</span>
              <div className="w-10 h-10 rounded-xl bg-[#FF5733]/15 text-[#FF5733] flex items-center justify-center mb-4">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">Create a room</h3>
              <p className="text-xs text-[#A7ABB5] leading-relaxed">
                One click generates a private room. Choose a room name, pick your guest avatar, and you're in.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#151820] border border-white/5 relative">
              <span className="text-3xl font-black text-white/10 absolute top-4 right-4">02</span>
              <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/15 text-[#8B5CF6] flex items-center justify-center mb-4">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">Invite your friends</h3>
              <p className="text-xs text-[#A7ABB5] leading-relaxed">
                Copy the short invite link or scan the QR code to join effortlessly from a phone or second laptop.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#151820] border border-white/5 relative">
              <span className="text-3xl font-black text-white/10 absolute top-4 right-4">03</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-4">
                <Play className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">Watch together</h3>
              <p className="text-xs text-[#A7ABB5] leading-relaxed">
                Paste a YouTube video for synced playback or share your screen for games, movies, and streams.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="py-20 max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Feature 1: Watch Together */}
          <div className="p-8 rounded-3xl bg-[#151820] border border-white/5 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#FF5733]/15 text-[#FF5733] flex items-center justify-center mb-6">
                <Film className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Watch Together</h3>
              <p className="text-sm text-[#A7ABB5] leading-relaxed mb-6">
                Synchronized YouTube playback. Play, pause, and seek commands mirror instantaneously across everyone in the room with automatic drift reconciliation and one-click "Sync me".
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#FF5733]">
              <Zap className="w-4 h-4" />
              <span>Sub-second drift tolerance</span>
            </div>
          </div>

          {/* Feature 2: Screen Share */}
          <div className="p-8 rounded-3xl bg-[#151820] border border-white/5 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#8B5CF6]/15 text-[#8B5CF6] flex items-center justify-center mb-6">
                <Monitor className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Share Anything</h3>
              <p className="text-sm text-[#A7ABB5] leading-relaxed mb-6">
                First-class screen sharing for content that cannot be synchronized directly. Share a browser tab, application window, or full screen for games, local files, and presentations.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#8B5CF6]">
              <ShieldCheck className="w-4 h-4" />
              <span>Native browser capture APIs</span>
            </div>
          </div>

          {/* Feature 3: Two-Laptop Setup */}
          <div className="p-8 rounded-3xl bg-[#151820] border border-white/5 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-400/15 text-amber-400 flex items-center justify-center mb-6">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Built for Two Laptops</h3>
              <p className="text-sm text-[#A7ABB5] leading-relaxed mb-6">
                Have Laptop A play content or share a screen while you join the same room on Laptop B or your phone to talk with friends, monitor chat, and drop reactions.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <QrCode className="w-4 h-4" />
              <span>Instant QR code pairing</span>
            </div>
          </div>

          {/* Feature 4: Social Presence */}
          <div className="p-8 rounded-3xl bg-[#151820] border border-white/5 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-6">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Social Presence</h3>
              <p className="text-sm text-[#A7ABB5] leading-relaxed mb-6">
                Voice and camera powered by Jitsi WebRTC, live speaking indicators, floating emoji reactions, room participant list, and Up Next playlist queue.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Volume2 className="w-4 h-4" />
              <span>Low-latency audio & floating reactions</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-[#6B7280] mt-auto">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white/80">Watch Party</span>
            <span>—</span>
            <span>Watch anything. Together.</span>
          </div>
          <p>© {new Date().getFullYear()} Watch Party. Cinematic social viewing.</p>
        </div>
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
