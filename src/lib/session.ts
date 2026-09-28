import { UserSession } from "@/types/room";

const SESSION_KEY = "watchparty_user_session";

export const AVATAR_OPTIONS = [
  "🍿", "🎬", "🦊", "🚀", "🐼", "⚡", "🎧", "👾", "✨", "🍕", "🔥", "🔮"
];

export function getUserSession(): UserSession {
  if (typeof window === "undefined") {
    return {
      userId: "server_id",
      displayName: "Guest",
      avatar: "🍿",
    };
  }

  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.userId && parsed.displayName) {
        return parsed;
      }
    }
  } catch {
    // ignore parse error
  }

  // Create new guest session
  const randomNum = Math.floor(100 + Math.random() * 900);
  const randomAvatar = AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)];
  const newSession: UserSession = {
    userId: "usr_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
    displayName: `Guest_${randomNum}`,
    avatar: randomAvatar,
  };

  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
  } catch {
    // ignore storage error
  }

  return newSession;
}

export function saveUserSession(session: UserSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

/**
 * Generates a clean 6-character room code (avoiding confusing chars like 0/O, 1/I)
 */
export function generateRoomCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
