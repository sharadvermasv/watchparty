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

  // Stable references for async and event callbacks
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

  // Universal publisher: sends via ntfy.sh SSE topic, BroadcastChannel, and Supabase
  const publishNetworkMessage = useCallback(
    (data: any) => {
      const effectiveCode = roomCode.toUpperCase();
      const topic = `wp_party_${effectiveCode.toLowerCase()}`;

      // 1. BroadcastChannel (local tabs on same machine)
      try {
        broadcastChannelRef.current?.postMessage(data);
      } catch {}

      // 2. HTTPS Pub/Sub Relay (cross-device across the internet)
      try {
        fetch(`https://ntfy.sh/${topic}`, {
          method: "POST",
          body: JSON.stringify(data),
          headers: {
            "Content-Type": "application/json",
          },
        }).catch(() => {});
      } catch {}
    },
    [roomCode]
  );

  // Send a WebRTC offer for screen sharing to a specific participant
  const sendWebRTCOfferTo = useCallback(
    async (targetUserId: string, stream: MediaStream) => {
      const user = currentUserRef.current;
      if (!user || targetUserId === user.userId) return;

      try {
        // Close existing connection if any
        const existing = peerConnectionsRef.current.get(targetUserId);
        if (existing) {
          try { existing.close(); } catch {}
        }

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionsRef.current.set(targetUserId, pc);

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            publishNetworkMessage({
              type: "WEBRTC_ICE",
              targetId: targetUserId,
              senderId: user.userId,
              candidate: e.candidate.toJSON(),
            });
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        publishNetworkMessage({
          type: "WEBRTC_OFFER",
          targetId: targetUserId,
          senderId: user.userId,
          sdp: offer,
        });
      } catch (err) {
        console.warn("Error sending WebRTC offer to", targetUserId, err);
      }
    },
    [publishNetworkMessage]
  );

  // Broadcast WebRTC MediaStream for Screen Sharing to all participants
  const broadcastScreenStream = useCallback(
    (stream: MediaStream) => {
      localScreenStreamRef.current = stream;
      const user = currentUserRef.current;
      if (!user) return;

      publishNetworkMessage({
        type: "SCREEN_SHARE_STARTED",
        senderId: user.userId,
      });

      participantsRef.current.forEach((p) => {
        if (p.user_id !== user.userId) {
          sendWebRTCOfferTo(p.user_id, stream);
        }
      });
    },
    [publishNetworkMessage, sendWebRTCOfferTo]
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

    publishNetworkMessage({
      type: "SCREEN_SHARE_STOPPED",
    });
  }, [publishNetworkMessage]);

  // Handle incoming network data payload (stable callback with zero churn)
  const handleNetworkData = useCallback(
    async (data: any) => {
      if (!data || !data.type) return;
      const myId = currentUserRef.current?.userId;

      // Ignore messages sent by self
      if (data.senderId && data.senderId === myId) return;

      switch (data.type) {
        case "HELLO":
        case "HEARTBEAT": {
          const incomingP: Participant = data.participant;
          if (!incomingP || incomingP.user_id === myId) break;

          setParticipants((prev) => {
            const now = new Date().toISOString();
            const exists = prev.find((p) => p.user_id === incomingP.user_id);

            let updated: Participant[];
            if (exists) {
              updated = prev.map((p) =>
                p.user_id === incomingP.user_id
                  ? { ...p, ...incomingP, last_seen: now }
                  : p
              );
            } else {
              showToast(`${incomingP.display_name} joined the room`);
              updated = [...prev, { ...incomingP, last_seen: now }];
            }

            // Universal Host: Earliest joined participant is host
            const sortedByJoin = [...updated].sort(
              (a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
            );

            if (sortedByJoin.length > 0) {
              const canonicalHost = sortedByJoin[0];
              setRoom((cur) =>
                cur && cur.host_id !== canonicalHost.user_id
                  ? { ...cur, host_id: canonicalHost.user_id }
                  : cur
              );
            }

            return updated;
          });

          // If a new peer says HELLO and we are host, reply with full room state & participants
          if (data.type === "HELLO" && isHostRef.current) {
            publishNetworkMessage({
              type: "WELCOME",
              watchState: watchStateRef.current,
              queue: queueRef.current,
              participants: participantsRef.current,
              hostId: currentUserRef.current?.userId,
            });

            // If we are sharing screen, connect to the new peer immediately
            if (localScreenStreamRef.current) {
              sendWebRTCOfferTo(incomingP.user_id, localScreenStreamRef.current);
            }
          }
          break;
        }

        case "WELCOME": {
          if (data.hostId) {
            setRoom((cur) => (cur ? { ...cur, host_id: data.hostId } : cur));
          }

          // Merge participants
          if (Array.isArray(data.participants)) {
            setParticipants((prev) => {
              const map = new Map<string, Participant>();
              prev.forEach((p) => map.set(p.user_id, p));
              data.participants.forEach((p: Participant) => {
                if (!map.has(p.user_id)) {
                  map.set(p.user_id, p);
                }
              });
              return Array.from(map.values());
            });
          }

          // Apply host's current watch state
          if (data.watchState) {
            setWatchState(data.watchState);
            watchStateRef.current = data.watchState;
          }

          if (data.queue && Array.isArray(data.queue)) {
            setQueue(data.queue);
          }
          break;
        }

        case "PARTICIPANT_UPDATE": {
          if (data.userId === myId) break;
          setParticipants((prev) =>
            prev.map((p) =>
              p.user_id === data.userId
                ? { ...p, ...data.updates, last_seen: new Date().toISOString() }
                : p
            )
          );
          break;
        }

        case "WATCH_STATE_UPDATE": {
          setWatchState(data.watchState);
          watchStateRef.current = data.watchState;
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

        case "WEBRTC_OFFER": {
          if (data.targetId !== myId) return;

          try {
            const pc = new RTCPeerConnection(ICE_SERVERS);
            peerConnectionsRef.current.set(data.senderId, pc);

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
                publishNetworkMessage({
                  type: "WEBRTC_ICE",
                  targetId: data.senderId,
                  senderId: myId,
                  candidate: e.candidate.toJSON(),
                });
              }
            };

            await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

            // Flush any early received ICE candidates
            const queued = pendingCandidatesRef.current.get(data.senderId) || [];
            for (const cand of queued) {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
            pendingCandidatesRef.current.delete(data.senderId);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            publishNetworkMessage({
              type: "WEBRTC_ANSWER",
              targetId: data.senderId,
              senderId: myId,
              sdp: answer,
            });
          } catch (err) {
            console.warn("WebRTC offer handling error:", err);
          }
          break;
        }

        case "WEBRTC_ANSWER": {
          if (data.targetId !== myId) return;

          const pc = peerConnectionsRef.current.get(data.senderId);
          if (pc) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

              const queued = pendingCandidatesRef.current.get(data.senderId) || [];
              for (const cand of queued) {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              }
              pendingCandidatesRef.current.delete(data.senderId);
            } catch (err) {
              console.warn("WebRTC answer handling error:", err);
            }
          }
          break;
        }

        case "WEBRTC_ICE": {
          if (data.targetId !== myId) return;

          const pc = peerConnectionsRef.current.get(data.senderId);
          if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (err) {
              console.warn("Add ICE candidate error:", err);
            }
          } else {
            const list = pendingCandidatesRef.current.get(data.senderId) || [];
            list.push(data.candidate);
            pendingCandidatesRef.current.set(data.senderId, list);
          }
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
          if (data.userId === myId) break;
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
    },
    [showToast, triggerReactionAnimation, publishNetworkMessage, sendWebRTCOfferTo]
  );

  // Update participant state (mic, cam, speaking, sharing)
  const updateMyParticipantStatus = useCallback(
    (updates: Partial<Participant>) => {
      const user = currentUserRef.current;
      const currentRoom = roomRef.current;
      if (!user || !currentRoom) return;

      setParticipants((prev) =>
        prev.map((p) => (p.user_id === user.userId ? { ...p, ...updates, last_seen: new Date().toISOString() } : p))
      );

      publishNetworkMessage({
        type: "PARTICIPANT_UPDATE",
        userId: user.userId,
        senderId: user.userId,
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
    [publishNetworkMessage]
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

        publishNetworkMessage({
          type: "WATCH_STATE_UPDATE",
          senderId: user.userId,
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
    [publishNetworkMessage]
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

        publishNetworkMessage({
          type: "QUEUE_ADD",
          senderId: user.userId,
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
    [publishNetworkMessage]
  );

  // Remove from Queue
  const removeFromQueue = useCallback(
    (itemId: string) => {
      const currentRoom = roomRef.current;
      const user = currentUserRef.current;
      setQueue((prev) => {
        const updated = prev.filter((i) => i.id !== itemId);
        if (currentRoom) {
          publishNetworkMessage({
            type: "QUEUE_REMOVE",
            senderId: user?.userId,
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
    [publishNetworkMessage]
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

      publishNetworkMessage({
        type: "NEW_MESSAGE",
        senderId: user.userId,
        message: newMsg,
      });

      if (isSupabaseConfigured) {
        const supabase = getSupabaseClient();
        if (supabase) {
          supabase.from("messages").insert(newMsg).then();
        }
      }
    },
    [publishNetworkMessage]
  );

  // Send Floating Reaction
  const sendReaction = useCallback(
    (emoji: string) => {
      const user = currentUserRef.current;
      const currentRoom = roomRef.current;
      if (!user) return;
      triggerReactionAnimation(emoji, user.displayName);

      publishNetworkMessage({
        type: "REACTION",
        senderId: user.userId,
        emoji,
        senderName: user.displayName,
      });

      if (isSupabaseConfigured) {
        const supabase = getSupabaseClient();
        if (supabase && currentRoom) {
          supabase.channel(`room_${currentRoom.id}`).send({
            type: "broadcast",
            event: "REACTION",
            payload: { emoji, senderName: user.displayName },
          });
        }
      }
    },
    [triggerReactionAnimation, publishNetworkMessage]
  );

  // Transfer Host
  const transferHost = useCallback(
    (newHostUserId: string) => {
      const currentRoom = roomRef.current;
      const user = currentUserRef.current;
      if (!currentRoom) return;

      setParticipants((prev) => {
        const target = prev.find((p) => p.user_id === newHostUserId);
        if (target) {
          showToast(`${target.display_name} is now the host`);
        }
        return prev;
      });

      setRoom((prev) => (prev ? { ...prev, host_id: newHostUserId } : null));

      publishNetworkMessage({
        type: "HOST_TRANSFER",
        senderId: user?.userId,
        newHostId: newHostUserId,
      });

      if (isSupabaseConfigured) {
        const supabase = getSupabaseClient();
        if (supabase) {
          supabase.from("rooms").update({ host_id: newHostUserId }).eq("id", currentRoom.id).then();
        }
      }
    },
    [showToast, publishNetworkMessage]
  );

  // Main Network Initialization (SSE Realtime Stream + BroadcastChannel)
  useEffect(() => {
    const user = getUserSession();
    setCurrentUser(user);
    currentUserRef.current = user;

    const effectiveCode = roomCode.toUpperCase();
    const topic = `wp_party_${effectiveCode.toLowerCase()}`;

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

    // 1. Listen to BroadcastChannel (local tabs)
    bc.onmessage = (event) => {
      handleNetworkData(event.data);
    };

    // 2. Listen to Server-Sent Events (SSE) across the Internet
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`https://ntfy.sh/${topic}/sse`);
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed && parsed.message) {
            const inner = typeof parsed.message === "string" ? JSON.parse(parsed.message) : parsed.message;
            handleNetworkData(inner);
          }
        } catch {}
      };
    } catch (e) {
      console.warn("SSE connection error:", e);
    }

    // 3. Announce presence to room immediately
    publishNetworkMessage({
      type: "HELLO",
      senderId: user.userId,
      participant: myParticipant,
    });

    // 4. Regular Heartbeat every 3s to maintain live presence across the internet
    const heartbeatInterval = setInterval(() => {
      if (!isMounted) return;

      publishNetworkMessage({
        type: "HEARTBEAT",
        senderId: user.userId,
        participant: {
          ...myParticipant,
          is_sharing: Boolean(localScreenStreamRef.current),
        },
      });

      // Prune inactive participants (no heartbeat in >10s)
      setParticipants((prev) => {
        const cutoff = Date.now() - 10000;
        const active = prev.filter((p) => {
          if (p.user_id === user.userId) return true;
          const last = new Date(p.last_seen || 0).getTime();
          return last > cutoff;
        });
        return active;
      });
    }, 3000);

    setConnectionStatus("connected");
    setIsLoading(false);

    const handleBeforeUnload = () => {
      publishNetworkMessage({
        type: "GOODBYE",
        senderId: user.userId,
        userId: user.userId,
      });
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      isMounted = false;
      clearInterval(heartbeatInterval);
      handleBeforeUnload();
      window.removeEventListener("beforeunload", handleBeforeUnload);
      bc.close();
      if (eventSource) {
        try {
          eventSource.close();
        } catch {}
      }
    };
  }, [roomCode]); // ONLY depends on roomCode! NEVER restarts on state change!

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
