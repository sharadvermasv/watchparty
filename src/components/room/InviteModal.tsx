"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Check, QrCode, Smartphone, Laptop, Share2 } from "lucide-react";

interface InviteModalProps {
  roomCode: string;
  roomName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function InviteModal({ roomCode, roomName, isOpen, onClose }: InviteModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"link" | "qr">("link");

  if (!isOpen) return null;

  const roomUrl = typeof window !== "undefined"
    ? `${window.location.origin}/r/${roomCode}`
    : `https://watchparty.app/r/${roomCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Join my watch party: ${roomName}`,
        text: `Watch videos together with me in room ${roomCode}!`,
        url: roomUrl,
      }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#151820] border border-white/10 rounded-2xl p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="mb-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF5733] bg-[#FF5733]/15 px-2 py-0.5 rounded">
            Room {roomCode}
          </span>
          <h3 className="text-xl font-bold text-white mt-1">Invite your friends</h3>
          <p className="text-xs text-[#A7ABB5] mt-1">
            Anyone with this link or QR code can join and watch with you.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-[#111318] p-1 rounded-xl mb-5 border border-white/5">
          <button
            onClick={() => setActiveTab("link")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "link"
                ? "bg-[#151820] text-white shadow-sm"
                : "text-[#A7ABB5] hover:text-white"
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            Invite Link
          </button>
          <button
            onClick={() => setActiveTab("qr")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "qr"
                ? "bg-[#151820] text-white shadow-sm"
                : "text-[#A7ABB5] hover:text-white"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            2nd Laptop / Phone QR
          </button>
        </div>

        {activeTab === "link" ? (
          <div>
            <div className="bg-[#08090B] border border-white/10 rounded-xl p-3 flex items-center justify-between mb-4">
              <span className="text-xs text-white/80 font-mono truncate mr-2">
                {roomUrl}
              </span>
              <button
                onClick={handleCopy}
                className="shrink-0 flex items-center gap-1.5 text-xs bg-[#FF5733] hover:bg-[#ff6e4d] text-white px-3 py-1.5 rounded-lg font-medium transition cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>✓ Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            <button
              onClick={handleNativeShare}
              className="w-full py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-xs font-semibold text-white/90 hover:text-white bg-white/5 hover:bg-white/10 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share via System Picker
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="p-4 bg-white rounded-2xl shadow-xl mb-3">
              <QRCodeSVG value={roomUrl} size={160} level="M" />
            </div>

            <p className="text-xs font-medium text-white mb-1 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-[#FF5733]" />
              Scan to join on your phone or second laptop
            </p>
            <p className="text-[11px] text-[#A7ABB5] max-w-xs mb-3">
              Great for having video play on Laptop A while you chat and voice-call from Laptop B!
            </p>

            <span className="text-xs font-mono text-white/50 bg-[#08090B] px-3 py-1 rounded-full border border-white/10">
              {roomCode}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
