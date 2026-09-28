"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Check, Smartphone, Laptop, Share2 } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md glass-panel rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.7)] border border-white/[0.14]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="mb-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF5733] bg-[#FF5733]/20 border border-[#FF5733]/30 px-2.5 py-0.5 rounded-full">
            Room {roomCode}
          </span>
          <h3 className="text-xl font-bold text-white mt-2">Invite your friends</h3>
          <p className="text-xs text-[#A7ABB5] mt-1">
            Anyone with this link or QR code can join and watch with you.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-black/30 p-1 rounded-xl mb-5 border border-white/[0.08]">
          <button
            onClick={() => setActiveTab("link")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
              activeTab === "link"
                ? "bg-white/[0.12] text-white shadow-sm border border-white/10"
                : "text-[#A7ABB5] hover:text-white"
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            Invite Link
          </button>
          <button
            onClick={() => setActiveTab("qr")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
              activeTab === "qr"
                ? "bg-white/[0.12] text-white shadow-sm border border-white/10"
                : "text-[#A7ABB5] hover:text-white"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Phone / 2nd Device QR
          </button>
        </div>

        {activeTab === "link" ? (
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A7ABB5] mb-1.5">
                Shareable Room Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={roomUrl}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-white select-all font-mono"
                />
                <button
                  onClick={handleCopy}
                  className="p-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.12] text-white transition cursor-pointer shrink-0 active:scale-95"
                  title="Copy link"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#FF5733] to-[#ff724d] hover:brightness-110 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-[#FF5733]/30 border border-white/20 active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Link Copied!" : "Copy Link"}</span>
              </button>

              <button
                onClick={handleNativeShare}
                className="py-2.5 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-white/[0.12] active:scale-95"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-2">
            {/* QR Card */}
            <div className="p-4 bg-white rounded-2xl shadow-xl border-4 border-white/10 mb-4">
              <QRCodeSVG
                value={roomUrl}
                size={180}
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="text-xs text-white/90 font-medium text-center">
              Scan with your phone camera or tablet
            </p>
            <p className="text-[11px] text-[#A7ABB5] text-center mt-1 max-w-xs">
              Opens this exact room instantly so you can chat or watch from your couch.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
