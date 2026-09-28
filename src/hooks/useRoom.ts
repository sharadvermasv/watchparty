"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Room,
  Participant,
  WatchState,
  QueueItem,
  ChatMessage,
  FloatingReaction,
  UserSession,
} from "@/types/room";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { getUserSession } from "@/lib/session";
import { parseYouTubeVideoId } from "@/lib/sync/driftCalculator";

interface UseRoomProps {
  roomCode: string;
  initialRoomName?: string;
}

export function useRoom({ roomCode, initialRoomName }: UseRoomProps) {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [watchState, setWatchState] = useState<WatchState>({
    room_id: "",
    mode: "idle",
    media_url: null,
    media_title: null,
    is_playing: false,
    current_time: 0,
    updated_at: new Date().toISOString(),
    updated_by: "",
  });
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Stable refs to prevent callback recreate loops
  const currentUserRef = useRef<UserSession | null>(null);
  currentUserRef.current = currentUser;

  const roomRef = useRef<Room | null>(null);
  roomRef.current = room;

  const watchStateRef = useRef<WatchState>(watchState);
  watchStateRef.current = watchState;

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  const isHost = Boolean(room && currentUser && room.host_id === currentUser.userId);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  }, []);

  // Trigger floating reaction
  const triggerReactionAnimation = useCallback((emoji: string, senderName: string) => {
    const newReaction: FloatingReaction = {
      id: "rx_" + Math.random().toString(36).substring(2, 9),
      emoji,
      senderName,
      xPercent: 15 + Math.random() * 70,
    };
    setFloatingReactions((prev) => [...prev.slice(-15), newReaction]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 2500);
  }, []);

  // Update participant state (mic, cam, speaking, sharing)
  const updateMyParticipantStatus = useCallback((updates: Partial<Participant>) => {
    const user = currentUserRef.current;
    const currentRoom = roomRef.current;
    if (!user || !currentRoom) return;

    setParticipants((prev) =>
      prev.map((p) => (p.user_id === user.userId ? { ...p, ...updates, last_seen: new Date().toISOString() } : p))
    );

    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        supabase
          .from("participants")
          .update(updates)
          .eq("room_id", currentRoom.id)
          .eq("user_id", user.userId)
          .then();
      }
    } else if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: "PARTICIPANT_UPDATE",
        userId: user.userId,
        updates,
      });
    }
  }, []);

  // Host update watch state
  const updateWatchState = useCallback((updates: Partial<WatchState>) => {
    const currentRoom = roomRef.current;
    const user = currentUserRef.current;
    if (!currentRoom || !user) return;

    setWatchState((prev) => {
      const nextState: WatchState = {
        ...prev,
        ...updates,
        room_id: currentRoom.id,
        updated_at: new Date().toISOString(),
        updated_by: user.userId,
      };

      if (isSupabaseConfigured) {
        const supabase = getSupabaseClient();
        if (supabase) {
          supabase
            .from("watch_state")
            .upsert(nextState)
            .then();
        }
      } else if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: "WATCH_STATE_UPDATE",
          watchState: nextState,
        });
        try {
          localStorage.setItem(`wp_state_${currentRoom.room_code}`, JSON.stringify(nextState));
        } catch {}
      }

      return nextState;
    });
  }, []);

  // Add to Queue
  const addToQueue = useCallback((url: string, title?: string) => {
    const currentRoom = roomRef.current;
    const user = currentUserRef.current;
    if (!currentRoom || !user) return;
    const videoId = parseYouTubeVideoId(url);
    const resolvedTitle = title || (videoId ? `YouTube Video (${videoId})` : "Video Link");
    const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : undefined;

    setQueue((prev) => {
      const newItem: QueueItem = {
        id: "q_" + Math.random().toString(36).substring(2, 9),
        room_id: currentRoom.id,
        media_url: url,
        title: resolvedTitle,
        thumbnail,
        added_by: user.displayName,
        position: prev.length,
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured) {
        const supabase = getSupabaseClient();
        if (supabase) {
          supabase.from("queue").insert(newItem).then();
        }
      } else if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: "QUEUE_ADD",
          item: newItem,
        });
        try {
          const stored = JSON.parse(localStorage.getItem(`wp_queue_${currentRoom.room_code}`) || "[]");
          localStorage.setItem(`wp_queue_${currentRoom.room_code}`, JSON.stringify([...stored, newItem]));
        } catch {}
      }

      return [...prev, newItem];
    });
  }, []);

  // Remove from Queue
  const removeFromQueue = useCallback((itemId: string) => {
    const currentRoom = roomRef.current;
    setQueue((prev) => {
      const updated = prev.filter((i) => i.id !== itemId);
      if (currentRoom) {
        if (isSupabaseConfigured) {
          const supabase = getSupabaseClient();
          if (supabase) {
            supabase.from("queue").delete().eq("id", itemId).then();
          }
        } else if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({
            type: "QUEUE_REMOVE",
            itemId,
          });
          try {
            localStorage.setItem(`wp_queue_${currentRoom.room_code}`, JSON.stringify(updated));
          } catch {}
        }
      }
      return updated;
    });
  }, []);

  // Play Queue Item (Host only)
  const playQueueItem = useCallback((item: QueueItem) => {
    updateWatchState({
      mode: "watch",
      media_url: item.media_url,
      media_title: item.title,
      current_time: 0,
      is_playing: true,
    });
    removeFromQueue(item.id);
  }, [updateWatchState, removeFromQueue]);

  // Send Chat message
  const sendMessage = useCallback((text: string) => {
    const currentRoom = roomRef.current;
    const user = currentUserRef.current;
    if (!currentRoom || !user || !text.trim()) return;

    const newMsg: ChatMessage = {
      id: "msg_" + Math.random().toString(36).substring(2, 9),
      room_id: currentRoom.id,
      participant_name: user.displayName,
      participant_id: user.userId,
      avatar: user.avatar,
      message: text.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);

    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        supabase.from("messages").insert(newMsg).then();
      }
    } else if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: "NEW_MESSAGE",
        message: newMsg,
      });
    }
  }, []);

  // Send Floating Reaction
  const sendReaction = useCallback((emoji: string) => {
    const user = currentUserRef.current;
    const currentRoom = roomRef.current;
    if (!user) return;
    triggerReactionAnimation(emoji, user.displayName);

    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase && currentRoom) {
        supabase.channel(`room_${currentRoom.id}`).send({
          type: "broadcast",
          event: "REACTION",
          payload: { emoji, senderName: user.displayName },
        });
      }
    } else if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: "REACTION",
        emoji,
        senderName: user.displayName,
      });
    }
  }, [triggerReactionAnimation]);

  // Transfer Host
  const transferHost = useCallback((newHostUserId: string) => {
    const currentRoom = roomRef.current;
    if (!currentRoom) return;
    setParticipants((prev) => {
      const target = prev.find((p) => p.user_id === newHostUserId);
      if (target) {
        showToast(`${target.display_name} is now the host`);
      }
      return prev;
    });

    setRoom((prev) => (prev ? { ...prev, host_id: newHostUserId } : null));

    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      if (supabase) {
        supabase.from("rooms").update({ host_id: newHostUserId }).eq("id", currentRoom.id).then();
      }
    } else if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: "HOST_TRANSFER",
        newHostId: newHostUserId,
      });
    }
  }, [showToast]);

  // Main Initialization Effect (runs ONLY on roomCode change)
  useEffect(() => {
    const user = getUserSession();
    setCurrentUser(user);
    currentUserRef.current = user;

    const effectiveCode = roomCode.toUpperCase();
    const channelName = `watchparty_room_${effectiveCode}`;
    const bc = new BroadcastChannel(channelName);
    broadcastChannelRef.current = bc;

    let isMounted = true;

    // Check if room exists in localStorage (for fallback)
    const localRoomKey = `wp_room_${effectiveCode}`;
    let loadedRoom: Room;
    try {
      const raw = localStorage.getItem(localRoomKey);
      if (raw) {
        loadedRoom = JSON.parse(raw);
      } else {
        loadedRoom = {
          id: "rm_" + effectiveCode,
          room_code: effectiveCode,
          name: initialRoomName || `Watch Room ${effectiveCode}`,
          host_id: user.userId,
          is_private: true,
          created_at: new Date().toISOString(),
        };
        localStorage.setItem(localRoomKey, JSON.stringify(loadedRoom));
      }
    } catch {
      loadedRoom = {
        id: "rm_" + effectiveCode,
        room_code: effectiveCode,
        name: initialRoomName || `Watch Room ${effectiveCode}`,
        host_id: user.userId,
        is_private: true,
        created_at: new Date().toISOString(),
      };
    }

    if (isMounted) {
      setRoom(loadedRoom);
      roomRef.current = loadedRoom;
    }

    const myParticipant: Participant = {
      id: "part_" + user.userId,
      room_id: loadedRoom.id,
      user_id: user.userId,
      display_name: user.displayName,
      avatar: user.avatar,
      is_speaking: false,
      is_mic_muted: true,
      is_cam_muted: true,
      is_sharing: false,
      joined_at: new Date().toISOString(),
      last_seen: new Date().toISOString(),
    };

    setParticipants([myParticipant]);

    // Retrieve saved state/queue if any
    try {
      const savedState = localStorage.getItem(`wp_state_${effectiveCode}`);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        setWatchState(parsed);
        watchStateRef.current = parsed;
      }
      const savedQueue = localStorage.getItem(`wp_queue_${effectiveCode}`);
      if (savedQueue) {
        setQueue(JSON.parse(savedQueue));
      }
    } catch {}

    // Listen to local BroadcastChannel events (cross-tab / multi-window)
    bc.onmessage = (event) => {
      const data = event.data;
      if (!data) return;

      switch (data.type) {
        case "HELLO": {
          const newP: Participant = data.participant;
          if (!newP) break;
          setParticipants((prev) => {
            const exists = prev.find((p) => p.user_id === newP.user_id);
            if (exists) return prev;
            showToast(`${newP.display_name} joined the room`);
            return [...prev, newP];
          });
          bc.postMessage({
            type: "WELCOME",
            participant: myParticipant,
            room: loadedRoom,
            watchState: watchStateRef.current,
          });
          break;
        }

        case "WELCOME": {
          if (data.participant) {
            setParticipants((prev) => {
              if (prev.some((p) => p.user_id === data.participant.user_id)) return prev;
              return [...prev, data.participant];
            });
          }
          if (data.watchState && data.watchState.updated_at) {
            setWatchState((cur) => {
              if (new Date(data.watchState.updated_at) > new Date(cur.updated_at)) {
                watchStateRef.current = data.watchState;
                return data.watchState;
              }
              return cur;
            });
          }
          break;
        }

        case "PARTICIPANT_UPDATE": {
          setParticipants((prev) =>
            prev.map((p) => (p.user_id === data.userId ? { ...p, ...data.updates } : p))
          );
          break;
        }

        case "WATCH_STATE_UPDATE": {
          setWatchState(data.watchState);
          watchStateRef.current = data.watchState;
          break;
        }

        case "QUEUE_ADD": {
          setQueue((prev) => {
            if (prev.some((i) => i.id === data.item.id)) return prev;
            return [...prev, data.item];
          });
          break;
        }

        case "QUEUE_REMOVE": {
          setQueue((prev) => prev.filter((i) => i.id !== data.itemId));
          break;
        }

        case "NEW_MESSAGE": {
          setMessages((prev) => [...prev, data.message]);
          break;
        }

        case "REACTION": {
          triggerReactionAnimation(data.emoji, data.senderName);
          break;
        }

        case "HOST_TRANSFER": {
          setRoom((prev) => (prev ? { ...prev, host_id: data.newHostId } : null));
          break;
        }

        case "GOODBYE": {
          setParticipants((prev) => {
            const departing = prev.find((p) => p.user_id === data.userId);
            if (departing) {
              showToast(`${departing.display_name} left the room`);
            }
            const remaining = prev.filter((p) => p.user_id !== data.userId);

            setRoom((currentRoom) => {
              if (currentRoom && currentRoom.host_id === data.userId && remaining.length > 0) {
                const newHost = remaining[0];
                showToast(`${newHost.display_name} is now the host`);
                return { ...currentRoom, host_id: newHost.user_id };
              }
              return currentRoom;
            });

            return remaining;
          });
          break;
        }
      }
    };

    // Announce self
    bc.postMessage({
      type: "HELLO",
      participant: myParticipant,
    });

    setConnectionStatus("connected");
    setIsLoading(false);

    const handleBeforeUnload = () => {
      bc.postMessage({
        type: "GOODBYE",
        userId: user.userId,
      });
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      isMounted = false;
      handleBeforeUnload();
      window.removeEventListener("beforeunload", handleBeforeUnload);
      bc.close();
    };
  }, [roomCode, initialRoomName, showToast, triggerReactionAnimation]);

  return {
    currentUser,
    room,
    isHost,
    participants,
    watchState,
    queue,
    messages,
    floatingReactions,
    isLoading,
    connectionStatus,
    toastMessage,
    updateWatchState,
    updateMyParticipantStatus,
    addToQueue,
    removeFromQueue,
    playQueueItem,
    sendMessage,
    sendReaction,
    transferHost,
  };
}
