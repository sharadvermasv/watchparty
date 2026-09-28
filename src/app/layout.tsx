import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Watch Party — Watch anything. Together.",
  description: "Create a private room, invite your friends, and watch videos or share screens together — wherever everyone is.",
  keywords: ["watch party", "synchronized video", "screen share", "webrtc", "youtube sync"],
};

export const viewport: Viewport = {
  themeColor: "#08090B",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#08090B] text-white selection:bg-[#FF5733] selection:text-white">
        {children}
      </body>
    </html>
  );
}
