import { WatchState } from "@/types/room";

/**
 * Calculates what the current playback position should be right now
 * based on canonical state and elapsed wall-clock time.
 */
export function calculateExpectedTime(watchState: WatchState, nowMs = Date.now()): number {
  if (!watchState.is_playing) {
    return Math.max(0, watchState.current_time);
  }

  const updatedAtMs = new Date(watchState.updated_at).getTime();
  if (isNaN(updatedAtMs) || updatedAtMs <= 0) {
    return Math.max(0, watchState.current_time);
  }

  const elapsedSeconds = Math.max(0, (nowMs - updatedAtMs) / 1000);
  return Math.max(0, watchState.current_time + elapsedSeconds);
}

/**
 * Returns signed drift: clientTime - expectedTime.
 * Positive = client is ahead; Negative = client is behind.
 */
export function getDrift(clientTime: number, expectedTime: number): number {
  return clientTime - expectedTime;
}

export type SyncAction =
  | { type: 'in_sync' }
  | { type: 'soft_sync'; targetRate: number }
  | { type: 'hard_sync'; targetTime: number };

/**
 * Reconciles drift according to PRD thresholds:
 * |drift| <= 1.0s: in-sync (playback speed 1.0x)
 * 1.0s < |drift| <= 3.0s: soft-sync (alter playback rate to catch up or wait smoothly)
 * |drift| > 3.0s: hard-sync (immediate seek)
 */
export function evaluateSyncAction(driftSeconds: number, expectedTime: number): SyncAction {
  const absDrift = Math.abs(driftSeconds);

  if (absDrift <= 1.0) {
    return { type: 'in_sync' };
  }

  if (absDrift <= 3.0) {
    // Client is behind -> speed up slightly (1.08x)
    // Client is ahead -> slow down slightly (0.92x)
    const targetRate = driftSeconds < 0 ? 1.08 : 0.92;
    return { type: 'soft_sync', targetRate };
  }

  // Large drift -> hard seek
  return { type: 'hard_sync', targetTime: expectedTime };
}

/**
 * Robust YouTube URL parser supporting:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - Pure video ID (11 chars)
 */
export function parseYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // If already an 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  const regexes = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
    /youtube\.com\/shorts\/([^"&?\/\s]{11})/i,
  ];

  for (const regex of regexes) {
    const match = trimmed.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export type MediaType = "youtube" | "hls" | "direct_video" | "unknown";

/**
 * Detects whether a URL is YouTube, HLS (.m3u8), or direct video file (.mp4, .webm, etc.)
 */
export function detectMediaType(url: string): MediaType {
  if (!url) return "unknown";
  const trimmed = url.trim();

  if (parseYouTubeVideoId(trimmed)) {
    return "youtube";
  }

  const lower = trimmed.toLowerCase();

  // Check for HLS .m3u8
  if (lower.includes(".m3u8") || lower.includes("m3u8") || lower.includes("/hls/")) {
    return "hls";
  }

  // Check for direct video formats
  if (
    lower.includes(".mp4") ||
    lower.includes(".webm") ||
    lower.includes(".ogv") ||
    lower.includes(".ogg") ||
    lower.includes(".mov") ||
    lower.includes(".m4v") ||
    lower.endsWith("/video")
  ) {
    return "direct_video";
  }

  // If starts with http:// or https:// and not recognized, treat as generic web direct stream
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return "direct_video";
  }

  return "unknown";
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const totalSec = Math.floor(seconds);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
