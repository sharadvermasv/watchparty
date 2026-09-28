"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
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

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun.services.mozilla.com" },
  ],
};

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
  const [remoteScreenStream, setRemoteScreenStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Stable references for async callbacks and event listeners
  const currentUserRef = useRef<UserSession | null>(null);
  currentUserRef.current = currentUser;

  const roomRef = useRef<Room | null>(null);
  roomRef.current = room;

  const isHost = Boolean(room && currentUser && room.host_id === currentUser.userId);
  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;

  const watchStateRef = useRef<WatchState>(watchState);
  watchStateRef.current = watchState;

  const participantsRef = useRef<Participant[]>(participants);
  participantsRef.current = participants;

  const queueRef = useRef<QueueItem[]>(queue);
  queueRef.current = queue;

  const myParticipantRef = useRef<Participant | null>(null);

  // Networking channels
  const supabaseChannelRef = useRef<RealtimeChannel | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // WebRTC Native Peer Connections for Screen Sharing
  const localScreenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  }, []);

  // Trigger floating reaction animation
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

  // Universal publisher via Supabase Realtime Broadcast & local BroadcastChannel
  const sendBroadcast = useCallback((event: string, payload: any) => {
    // 1. Supabase Realtime Broadcast
    if (supabaseChannelRef.current) {
      supabaseChannelRef.current
        .send({
          type: "broadcast",
          event,
          payload,
        })
        .catch((err) => {
          console.warn("Supabase Realtime broadcast send error:", err);
        });
    }

    // 2. BroadcastChannel (for local tabs in the same browser)
    try {
      broadcastChannelRef.current?.postMessage({ event, payload });
    } catch {}
  }, []);

  // Send a WebRTC offer for screen sharing to a specific participant
  const sendWebRTCOfferTo = useCallback(
    async (targetUserId: string, stream: MediaStream) => {
      const user = currentUserRef.current;
      if (!user || targetUserId === user.userId) return;

      try {
        const existing = peerConnectionsRef.current.get(targetUserId);
        if (existing) {
          try {
            existing.close();
          } catch {}
        }

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionsRef.current.set(targetUserId, pc);

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            sendBroadcast("WEBRTC_SIGNAL", {
              type: "WEBRTC_ICE",
              targetId: targetUserId,
              senderId: user.userId,
              candidate: e.candidate.toJSON(),
            });
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        sendBroadcast("WEBRTC_SIGNAL", {
          type: "WEBRTC_OFFER",
          targetId: targetUserId,
          senderId: user.userId,
          sdp: offer,
        });
      } catch (err) {
        console.warn("Error sending WebRTC offer to", targetUserId, err);
      }
    },
    [sendBroadcast]
  );

  // Broadcast WebRTC MediaStream for Screen Sharing to all participants
  const broadcastScreenStream = useCallback(
    (stream: MediaStream) => {
      localScreenStreamRef.current = stream;
      const user = currentUserRef.current;
      if (!user) return;

      sendBroadcast("SCREEN_SHARE_STARTED", {
        senderId: user.userId,
      });

      // Send WebRTC offer to every peer in the room
      participantsRef.current.forEach((p) => {
        if (p.user_id !== user.userId) {
          sendWebRTCOfferTo(p.user_id, stream);
        }
      });
    },
    [sendBroadcast, sendWebRTCOfferTo]
  );

  // Stop broadcasting screen stream
  const stopBroadcastingScreenStream = useCallback(() => {
    localScreenStreamRef.current = null;

    peerConnectionsRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch {}
    });
    peerConnectionsRef.current.clear();

    sendBroadcast("SCREEN_SHARE_STOPPED", {});
  }, [sendBroadcast]);

  // Handle incoming WebRTC signaling
  const handleWebRTCSignal = useCallback(
    async (signal: any) => {
      const myId = currentUserRef.current?.userId;
      if (!signal || !myId || signal.targetId !== myId) return;

      try {
        if (signal.type === "WEBRTC_OFFER") {
          const pc = new RTCPeerConnection(ICE_SERVERS);
          peerConnectionsRef.current.set(signal.senderId, pc);

          pc.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
              setRemoteScreenStream(event.streams[0]);
              setWatchState((prev) => ({
                ...prev,
                mode: "screen",
                media_url: null,
              }));
            }
          };

          pc.onicecandidate = (e) => {
            if (e.candidate) {
              sendBroadcast("WEBRTC_SIGNAL", {
                type: "WEBRTC_ICE",
                targetId: signal.senderId,
                senderId: myId,
                candidate: e.candidate.toJSON(),
              });
            }
          };

          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

          const queued = pendingCandidatesRef.current.get(signal.senderId) || [];
          for (const cand of queued) {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          }
          pendingCandidatesRef.current.delete(signal.senderId);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          sendBroadcast("WEBRTC_SIGNAL", {
            type: "WEBRTC_ANSWER",
            targetId: signal.senderId,
            senderId: myId,
            sdp: answer,
          });
        } else if (signal.type === "WEBRTC_ANSWER") {
          const pc = peerConnectionsRef.current.get(signal.senderId);
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            const queued = pendingCandidatesRef.current.get(signal.senderId) || [];
            for (const cand of queued) {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
            pendingCandidatesRef.current.delete(signal.senderId);
          }
        } else if (signal.type === "WEBRTC_ICE") {
          const pc = peerConnectionsRef.current.get(signal.senderId);
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
            const list = pendingCandidatesRef.current.get(signal.senderId) || [];
            list.push(signal.candidate);
            pendingCandidatesRef.current.set(signal.senderId, list);
          }
        }
      } catch (err) {
        console.warn("WebRTC signaling error:", err);
      }
    },
    [sendBroadcast]
  );

  // Update participant state (mic, cam, speaking, sharing)
  const updateMyParticipantStatus = useCallback(
    (updates: Partial<Participant>) => {
      const user = currentUserRef.current;
      const currentRoom = roomRef.current;
      if (!user || !currentRoom) return;

      const updatedParticipant: Participant = {
        ...(myParticipantRef.current || {
          id: "part_" + user.userId,
          room_id: currentRoom.id,
          user_id: user.userId,
          display_name: user.displayName,
          avatar: user.avatar,
          is_speaking: false,
          is_mic_muted: true,
          is_cam_muted: true,
          is_sharing: false,
          joined_at: new Date().toISOString(),
          last_seen: new Date().toISOString(),
        }),
        ...updates,
        last_seen: new Date().toISOString(),
      };
      myParticipantRef.current = updatedParticipant;

      setParticipants((prev) =>
        prev.map((p) => (p.user_id === user.userId ? updatedParticipant : p))
      );

      // Track in Supabase Realtime Presence
      if (supabaseChannelRef.current) {
        supabaseChannelRef.current.track(updatedParticipant).catch(() => {});
      }

      // Also broadcast for instant UI response
      sendBroadcast("PARTICIPANT_UPDATE", {
        userId: user.userId,
        updates,
      });

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
      }
    },
    [sendBroadcast]
  );

  // Host update watch state
  const updateWatchState = useCallback(
    (updates: Partial<WatchState>) => {
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

        sendBroadcast("WATCH_STATE_UPDATE", {
          watchState: nextState,
        });

        try {
          localStorage.setItem(`wp_state_${currentRoom.room_code}`, JSON.stringify(nextState));
        } catch {}

        if (isSupabaseConfigured) {
          const supabase = getSupabaseClient();
          if (supabase) {
            supabase
              .from("watch_state")
              .upsert(nextState)
              .then();
          }
        }

        return nextState;
      });
    },
    [sendBroadcast]
  );

  // Add to Queue
  const addToQueue = useCallback(
    (url: string, title?: string) => {
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

        sendBroadcast("QUEUE_ADD", {
          item: newItem,
        });

        try {
          const stored = JSON.parse(localStorage.getItem(`wp_queue_${currentRoom.room_code}`) || "[]");
          localStorage.setItem(`wp_queue_${currentRoom.room_code}`, JSON.stringify([...stored, newItem]));
        } catch {}

        if (isSupabaseConfigured) {
          const supabase = getSupabaseClient();
          if (supabase) {
            supabase.from("queue").insert(newItem).then();
          }
        }

        return [...prev, newItem];
      });
    },
    [sendBroadcast]
  );

  // Remove from Queue
  const removeFromQueue = useCallback(
    (itemId: string) => {
      const currentRoom = roomRef.current;
      setQueue((prev) => {
        const updated = prev.filter((i) => i.id !== itemId);
        if (currentRoom) {
          sendBroadcast("QUEUE_REMOVE", {
            itemId,
          });

          try {
            localStorage.setItem(`wp_queue_${currentRoom.room_code}`, JSON.stringify(updated));
          } catch {}

          if (isSupabaseConfigured) {
            const supabase = getSupabaseClient();
            if (supabase) {
              supabase.from("queue").delete().eq("id", itemId).then();
            }
          }
        }
        return updated;
      });
    },
    [sendBroadcast]
  );

  // Play Queue Item (Host only)
  const playQueueItem = useCallback(
    (item: QueueItem) => {
      updateWatchState({
        mode: "watch",
        media_url: item.media_url,
        media_title: item.title,
        current_time: 0,
        is_playing: true,
      });
      removeFromQueue(item.id);
    },
    [updateWatchState, removeFromQueue]
  );

  // Send Chat message
  const sendMessage = useCallback(
    (text: string) => {
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

      sendBroadcast("NEW_MESSAGE", {
        message: newMsg,
      });

      if (isSupabaseConfigured) {
        const supabase = getSupabaseClient();
        if (supabase) {
          supabase.from("messages").insert(newMsg).then();
        }
      }
    },
    [sendBroadcast]
  );

  // Send Floating Reaction
  const sendReaction = useCallback(
    (emoji: string) => {
      const user = currentUserRef.current;
      if (!user) return;
      triggerReactionAnimation(emoji, user.displayName);

      sendBroadcast("REACTION", {
        emoji,
        senderName: user.displayName,
      });
    },
    [triggerReactionAnimation, sendBroadcast]
  );

  // Transfer Host
  const transferHost = useCallback(
    (newHostUserId: string) => {
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

      sendBroadcast("HOST_TRANSFER", {
        newHostId: newHostUserId,
      });

      if (isSupabaseConfigured) {
        const supabase = getSupabaseClient();
        if (supabase) {
          supabase.from("rooms").update({ host_id: newHostUserId }).eq("id", currentRoom.id).then();
        }
      }
    },
    [showToast, sendBroadcast]
  );

  // Main Network Initialization (Supabase Realtime WebSockets + local BroadcastChannel)
  useEffect(() => {
    const user = getUserSession();
    setCurrentUser(user);
    currentUserRef.current = user;

    const effectiveCode = roomCode.toUpperCase();

    // Local BroadcastChannel for same machine tabs
    const channelName = `watchparty_room_${effectiveCode}`;
    const bc = new BroadcastChannel(channelName);
    broadcastChannelRef.current = bc;

    let isMounted = true;

    // Load or create initial room state
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
    myParticipantRef.current = myParticipant;
    setParticipants([myParticipant]);

    // Restore saved watch state if present
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

    // Handler for local BroadcastChannel messages
    bc.onmessage = (event) => {
      const { event: evt, payload } = event.data || {};
      handleBroadcastEvent(evt, payload);
    };

    function handleBroadcastEvent(event: string, payload: any) {
      if (!isMounted || !payload) return;
      const myId = currentUserRef.current?.userId;

      switch (event) {
        case "WATCH_STATE_UPDATE": {
          if (payload.watchState) {
            setWatchState(payload.watchState);
            watchStateRef.current = payload.watchState;
          }
          break;
        }

        case "SYNC_STATE": {
          if (payload.hostId) {
            setRoom((cur) => (cur ? { ...cur, host_id: payload.hostId } : cur));
          }
          if (payload.watchState) {
            setWatchState(payload.watchState);
            watchStateRef.current = payload.watchState;
          }
          if (payload.queue && Array.isArray(payload.queue)) {
            setQueue(payload.queue);
          }
          break;
        }

        case "REQUEST_SYNC": {
          // If we are host and someone requests sync, reply with full state
          if (isHostRef.current && payload.userId !== myId) {
            sendBroadcast("SYNC_STATE", {
              watchState: watchStateRef.current,
              queue: queueRef.current,
              hostId: currentUserRef.current?.userId,
            });

            // If we are sharing screen, also send offer to new user
            if (localScreenStreamRef.current && payload.userId) {
              sendWebRTCOfferTo(payload.userId, localScreenStreamRef.current);
            }
          }
          break;
        }

        case "PARTICIPANT_UPDATE": {
          if (payload.userId === myId) break;
          setParticipants((prev) =>
            prev.map((p) =>
              p.user_id === payload.userId
                ? { ...p, ...payload.updates, last_seen: new Date().toISOString() }
                : p
            )
          );
          break;
        }

        case "NEW_MESSAGE": {
          if (payload.message) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.message.id)) return prev;
              return [...prev, payload.message];
            });
          }
          break;
        }

        case "REACTION": {
          if (payload.emoji && payload.senderName) {
            triggerReactionAnimation(payload.emoji, payload.senderName);
          }
          break;
        }

        case "QUEUE_ADD": {
          if (payload.item) {
            setQueue((prev) => {
              if (prev.some((i) => i.id === payload.item.id)) return prev;
              return [...prev, payload.item];
            });
          }
          break;
        }

        case "QUEUE_REMOVE": {
          if (payload.itemId) {
            setQueue((prev) => prev.filter((i) => i.id !== payload.itemId));
          }
          break;
        }

        case "HOST_TRANSFER": {
          if (payload.newHostId) {
            setRoom((prev) => (prev ? { ...prev, host_id: payload.newHostId } : null));
          }
          break;
        }

        case "SCREEN_SHARE_STARTED": {
          setWatchState((prev) => ({
            ...prev,
            mode: "screen",
            media_url: null,
          }));
          break;
        }

        case "SCREEN_SHARE_STOPPED": {
          setRemoteScreenStream(null);
          setWatchState((prev) => ({
            ...prev,
            mode: "idle",
          }));
          break;
        }

        case "WEBRTC_SIGNAL": {
          handleWebRTCSignal(payload);
          break;
        }
      }
    }

    // Connect to Supabase Realtime Channel
    let supabaseChannel: RealtimeChannel | null = null;
    const supabase = getSupabaseClient();

    if (supabase) {
      supabaseChannel = supabase.channel(`wp_room_${effectiveCode}`, {
        config: {
          presence: { key: user.userId },
          broadcast: { self: false },
        },
      });
      supabaseChannelRef.current = supabaseChannel;

      // 1. Presence Sync: Synchronize active participants list across all devices
      supabaseChannel
        .on("presence", { event: "sync" }, () => {
          if (!isMounted) return;
          const presenceState = supabaseChannel?.presenceState() || {};
          const activeList: Participant[] = [];

          Object.values(presenceState).forEach((records: any) => {
            if (Array.isArray(records) && records.length > 0) {
              const latest = records[records.length - 1];
              activeList.push(latest);
            }
          });

          // Ensure self is in the list
          const hasSelf = activeList.some((p) => p.user_id === user.userId);
          if (!hasSelf && myParticipantRef.current) {
            activeList.push(myParticipantRef.current);
          }

          // Universal host election: participant with earliest joined_at is host
          if (activeList.length > 0) {
            const sortedByJoin = [...activeList].sort(
              (a, b) => new Date(a.joined_at || 0).getTime() - new Date(b.joined_at || 0).getTime()
            );
            const canonicalHost = sortedByJoin[0];
            setRoom((cur) =>
              cur && cur.host_id !== canonicalHost.user_id
                ? { ...cur, host_id: canonicalHost.user_id }
                : cur
            );
          }

          setParticipants(activeList);
        })
        .on("presence", { event: "join" }, ({ newPresences }) => {
          if (!isMounted) return;
          newPresences.forEach((p: any) => {
            if (p.user_id !== user.userId) {
              showToast(`${p.display_name || "A friend"} joined the room`);

              // If we are host, automatically send our state to the newcomer
              if (isHostRef.current) {
                supabaseChannel?.send({
                  type: "broadcast",
                  event: "SYNC_STATE",
                  payload: {
                    watchState: watchStateRef.current,
                    queue: queueRef.current,
                    hostId: currentUserRef.current?.userId,
                  },
                });

                // If sharing screen, send WebRTC offer to new participant
                if (localScreenStreamRef.current && p.user_id) {
                  sendWebRTCOfferTo(p.user_id, localScreenStreamRef.current);
                }
              }
            }
          });
        })
        .on("presence", { event: "leave" }, ({ leftPresences }) => {
          if (!isMounted) return;
          leftPresences.forEach((p: any) => {
            if (p.user_id !== user.userId) {
              showToast(`${p.display_name || "A friend"} left the room`);
            }
          });
        });

      // 2. Broadcast listeners
      const broadcastEvents = [
        "WATCH_STATE_UPDATE",
        "SYNC_STATE",
        "REQUEST_SYNC",
        "PARTICIPANT_UPDATE",
        "NEW_MESSAGE",
        "REACTION",
        "QUEUE_ADD",
        "QUEUE_REMOVE",
        "HOST_TRANSFER",
        "SCREEN_SHARE_STARTED",
        "SCREEN_SHARE_STOPPED",
        "WEBRTC_SIGNAL",
      ];

      broadcastEvents.forEach((evt) => {
        supabaseChannel?.on("broadcast", { event: evt }, ({ payload }) => {
          handleBroadcastEvent(evt, payload);
        });
      });

      // Subscribe to channel and track presence
      supabaseChannel.subscribe(async (status) => {
        if (!isMounted) return;
        if (status === "SUBSCRIBED") {
          setConnectionStatus("connected");
          setIsLoading(false);
          await supabaseChannel?.track(myParticipant);

          // Request state sync from any existing peers
          supabaseChannel?.send({
            type: "broadcast",
            event: "REQUEST_SYNC",
            payload: { userId: user.userId },
          });
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnectionStatus("error");
          setIsLoading(false);
        }
      });
    } else {
      // Fallback if Supabase not configured
      setConnectionStatus("connected");
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
      bc.close();
      if (supabaseChannel) {
        supabaseChannel.untrack().catch(() => {});
        supabase?.removeChannel(supabaseChannel).catch(() => {});
      }
    };
  }, [roomCode]); // ONLY depends on roomCode

  return {
    currentUser,
    room,
    isHost,
    participants,
    watchState,
    queue,
    messages,
    floatingReactions,
    remoteScreenStream,
    isLoading,
    connectionStatus,
    toastMessage,
    updateWatchState,
    updateMyParticipantStatus,
    broadcastScreenStream,
    stopBroadcastingScreenStream,
    addToQueue,
    removeFromQueue,
    playQueueItem,
    sendMessage,
    sendReaction,
    transferHost,
  };
}
