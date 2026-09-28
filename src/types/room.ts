export type WatchMode = 'idle' | 'watch' | 'screen';

export type SyncStatus = 'synced' | 'syncing' | 'paused' | 'error';

export interface Room {
  id: string;
  room_code: string;
  name: string;
  host_id: string;
  is_private: boolean;
  created_at: string;
}

export interface Participant {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string;
  avatar: string;
  is_speaking: boolean;
  is_mic_muted: boolean;
  is_cam_muted: boolean;
  is_sharing: boolean;
  joined_at: string;
  last_seen: string;
}

export interface WatchState {
  room_id: string;
  mode: WatchMode;
  media_url: string | null;
  media_title: string | null;
  is_playing: boolean;
  current_time: number;
  updated_at: string; // ISO string or timestamp
  updated_by: string;
}

export interface QueueItem {
  id: string;
  room_id: string;
  media_url: string;
  title: string;
  duration?: string;
  thumbnail?: string;
  added_by: string;
  position: number;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  participant_name: string;
  participant_id: string;
  avatar: string;
  message: string;
  is_reaction?: boolean;
  created_at: string;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  senderName: string;
  xPercent: number; // 0 to 100% across screen width
}

export interface UserSession {
  userId: string;
  displayName: string;
  avatar: string;
}
