# Watch Party — Social Video & Screen Sharing Platform

A cinematic, dark, immersive web application for watching synchronized videos and sharing screens together with friends online ("Letterboxd × Teleparty × modern streaming UI").

Built with **Next.js 15**, **TypeScript**, **Tailwind CSS**, **Supabase Realtime**, and **Jitsi Meet WebRTC**.

---

## 1. What the Project Is

Watch Party is designed around the core social viewing loop:
> **Create a private room → invite friends → watch something together → talk while watching.**

It prioritizes:
- **Zero-friction room creation**: Guest username & avatar selection, no mandatory accounts or passwords.
- **Two watch modes**:
  - **Mode A (Watch Together)**: Frame-synchronized YouTube player with drift reconciliation (<1s tolerance, 1–3s soft-sync, >3s hard seek) and one-click "Sync me".
  - **Mode B (Screen Share)**: First-class screen sharing for browser tabs, application windows, or full desktops using native browser WebRTC capture APIs.
- **Two-Laptop / Multi-Device Workflow**: QR code pairing to allow Laptop A to play video or stream a game, while Laptop B or a smartphone connects for voice, chat, and reactions.
- **Social Presence**: Integrated voice & camera via Jitsi Meet, real-time speaking indicators, chat, and floating emoji reactions (`😂 ❤️ 😭 🔥 💀 👀`).

---

## 2. Architecture

```text
                             WATCH PARTY APP (Next.js 15)
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
         Room State & Sync Engine                        Voice, Cam & Screen
        (PostgreSQL + Supabase RT)                        (Jitsi Meet WebRTC)
                  │                                               │
    ┌─────────────┴─────────────┐                   ┌─────────────┴─────────────┐
    ▼                           ▼                   ▼                           ▼
Canonical Watch State     Multi-tab Broadcast   Headless Mic/Cam       Browser Capture
(Play/Pause/Seek Deltas)  Channel Fallback      Speaking Analyzer     (getDisplayMedia)
```

---

## 3. Tech Stack

- **Frontend Framework**: Next.js 15 (App Router, Turbopack, React 19)
- **Styling**: Tailwind CSS v4 with custom cinematic dark theme palette (`#08090B`, `#111318`, `#151820`, `#FF5733`)
- **Icons**: Lucide React
- **Realtime & Database**: Supabase (PostgreSQL, Realtime Broadcast & Presence) with automatic `BroadcastChannel` local fallback
- **WebRTC Communication**: Jitsi Meet External API (`meet.jit.si`) + native Web Audio Analyser
- **QR Code Engine**: `qrcode.react`

---

## 4. Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase Configuration (Optional for local multi-tab testing, required for multi-network sync)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Jitsi Meet Domain (Defaults to public meet.jit.si service)
NEXT_PUBLIC_JITSI_DOMAIN=meet.jit.si
```

> **Note**: The application is equipped with an automatic local fallback (`BroadcastChannel`). If Supabase credentials are empty, you can test multi-tab / multi-window synchronization immediately on your local machine!

---

## 5. Supabase Setup & Database Schema

1. Create a project at [supabase.com](https://supabase.com).
2. Navigate to **SQL Editor** in your Supabase Dashboard.
3. Open `supabase/schema.sql` from this repository and run the script.
4. Tables created:
   - `rooms`: Room codes, room names, host ID, privacy.
   - `participants`: Live participant presence, mic/cam mute status, speaking activity.
   - `watch_state`: Canonical playback position, play/pause state, timestamp deltas.
   - `queue`: Up Next playlist items.
   - `messages`: Room chat messages and reaction logs.
5. In Supabase Dashboard -> **Database** -> **Replication**, verify that `supabase_realtime` is enabled for the tables.
6. Copy your **Project URL** and **Anon Public Key** from **Settings -> API** into `.env.local`.

---

## 6. Jitsi Setup

By default, the platform connects to the public `meet.jit.si` service.
- Voice and video are embedded behind the custom dark interface.
- Microphone activity is monitored with the browser's `AudioContext` and `AnalyserNode` to illuminate participant avatar borders with an animated glow when speaking.
- To use a self-hosted Jitsi instance, configure `NEXT_PUBLIC_JITSI_DOMAIN=your-jitsi-instance.com` in `.env.local`.

---

## 7. Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev

# 3. Open in your browser
# Navigate to http://localhost:3000
```

To test the multi-user experience:
1. Open `http://localhost:3000` in Window 1 and click **Create a Room**.
2. Click **Share** -> **Copy Link** (or use the room code e.g. `http://localhost:3000/r/7K4XM2`).
3. Open an Incognito / private browsing window (or another browser) and paste the URL.
4. Both participants will see each other in the room, chat messages synchronize in real time, and video controls mirror across windows.

---

## 8. Deployment

### Cloudflare Pages / Vercel / Railway
The app is built using Next.js App Router and can be deployed with zero configuration:
```bash
# Production build check
npm run build
```
On Vercel, Netlify, or Cloudflare Pages (with Next.js OpenNext adapter):
1. Import repository.
2. Add environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Deploy!

---

## 9. Known Browser & Screen-Sharing Limitations

1. **DRM Protected Content (Netflix, Disney+, Prime Video)**:
   - Browsers deliberately blank or black-out DRM-protected video streams during `getDisplayMedia` capture.
   - **Solution**: The app displays helpful guidance informing users that DRM content is protected by the browser, and recommends sharing an application window, browser tab, or using Watch Together mode for direct sync.
2. **Audio on macOS Screen Capture**:
   - Chrome on macOS only captures system audio when sharing a **Chrome Tab**, not the entire screen (due to macOS OS-level security policies).
3. **Autoplay Policies**:
   - Modern browsers require user interaction (a click) before playing audio. When joining an ongoing session, audio may be muted until the user clicks the cinema player or unmutes.

---

## 10. Future Improvements

- Custom video upload via S3 / Supabase Storage with HLS streaming.
- Synchronized subtitles and multi-track audio selection.
- Soundboard / sound reaction effects.
- Dedicated native desktop companion app using Electron / Tauri for system-wide audio capture on macOS.
