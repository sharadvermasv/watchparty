"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useRoom } from "@/hooks/useRoom";
import { useJitsi } from "@/hooks/useJitsi";
import { RoomHeader } from "@/components/room/RoomHeader";
import { RoomStage } from "@/components/room/RoomStage";
import { RoomControls } from "@/components/room/RoomControls";
import { SidePanel } from "@/components/room/SidePanel";
import { InviteModal } from "@/components/room/InviteModal";
import { AddMediaModal } from "@/components/room/AddMediaModal";
import { isSoundEnabled, setSoundEnabled } from "@/lib/audio/soundEffects";

export default function RoomPage() {
  const params = useParams();
  const roomCode = ((params?.code as string) || "").toUpperCase();

  const [activeTab, setActiveTab] = useState<"chat" | "people" | "queue" | null>("chat");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isAddMediaOpen, setIsAddMediaOpen] = useState(false);
  const [isFloatingChatOpen, setIsFloatingChatOpen] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(() => isSoundEnabled());

  const {
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
    toastMessage,
    typingUserNames,
    sendTyping,
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
  } = useRoom({ roomCode });

  // Stable callbacks for Jitsi & Screen Sharing events
  const handleParticipantSpeaking = useCallback(
    (speaking: boolean) => {
      updateMyParticipantStatus({ is_speaking: speaking });
    },
    [updateMyParticipantStatus]
  );

  const handleScreenShareStarted = useCallback(
    (stream: MediaStream) => {
      updateMyParticipantStatus({ is_sharing: true });
      updateWatchState({
        mode: "screen",
        media_url: null,
      });
      broadcastScreenStream(stream);
    },
    [updateMyParticipantStatus, updateWatchState, broadcastScreenStream]
  );

  const handleScreenShareStopped = useCallback(() => {
    updateMyParticipantStatus({ is_sharing: false });
    updateWatchState({
      mode: "idle",
    });
    stopBroadcastingScreenStream();
  }, [updateMyParticipantStatus, updateWatchState, stopBroadcastingScreenStream]);

  // WebRTC & Audio-Video Hook
  const {
    isMicMuted,
    isCamMuted,
    isScreenSharing,
    isSpeaking,
    screenStream,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
  } = useJitsi({
    roomCode,
    userName: currentUser?.displayName || "Guest",
    onParticipantSpeaking: handleParticipantSpeaking,
    onScreenShareStarted: handleScreenShareStarted,
    onScreenShareStopped: handleScreenShareStopped,
  });

  const handleToggleMic = useCallback(() => {
    toggleMic();
    updateMyParticipantStatus({ is_mic_muted: !isMicMuted });
  }, [toggleMic, isMicMuted, updateMyParticipantStatus]);

  const handleToggleCam = useCallback(() => {
    toggleCam();
    updateMyParticipantStatus({ is_cam_muted: !isCamMuted });
  }, [toggleCam, isCamMuted, updateMyParticipantStatus]);

  const handleToggleTab = (tab: "chat" | "people" | "queue") => {
    setActiveTab((cur) => (cur === tab ? null : tab));
  };

  const handlePlayNow = (url: string, title?: string) => {
    updateWatchState({
      mode: "watch",
      media_url: url,
      media_title: title || "YouTube Video",
      current_time: 0,
      is_playing: true,
    });
  };

  // Video ended -> Auto-play next item from queue if host
  const handleVideoEnded = useCallback(() => {
    if (isHost && queue.length > 0) {
      const nextItem = queue[0];
      playQueueItem(nextItem);
    }
  }, [isHost, queue, playQueueItem]);

  // Clickable timestamp seek
  const handleSeekTimestamp = useCallback(
    (seconds: number) => {
      if (isHost) {
        updateWatchState({
          current_time: seconds,
          is_playing: true,
        });
      }
    },
    [isHost, updateWatchState]
  );

  const handleToggleSound = useCallback(() => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setSoundEnabledState(next);
  }, [soundEnabled]);

  const handleToggleFloatingChat = useCallback(() => {
    setIsFloatingChatOpen((prev) => !prev);
  }, []);

  // Active stream: local if this user is sharing, or remote if friend is sharing
  const activeScreenStream = screenStream || remoteScreenStream;
  const isLocallySharing = Boolean(screenStream);

  if (isLoading || !room || !currentUser) {
    return (
      <div className="min-h-screen bg-[#08090B] flex flex-col items-center justify-center text-white">
        <div className="relative mb-4">
          <div className="absolute -inset-2 bg-gradient-to-r from-[#FF5733] to-[#ff8c42] rounded-2xl blur-lg opacity-75 animate-pulse" />
          <div className="relative w-12 h-12 rounded-2xl bg-[#FF5733] flex items-center justify-center font-black text-xl shadow-2xl">
            WP
          </div>
        </div>
        <p className="text-sm font-semibold tracking-wide">Entering room {roomCode}…</p>
        <p className="text-xs text-[#A7ABB5] mt-1">Connecting to your friends</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#08090B] flex flex-col overflow-hidden select-none">
      {/* Top Header */}
      <RoomHeader
        roomName={room.name}
        roomCode={room.room_code}
        participantCount={participants.length}
        isHost={isHost}
        onOpenInvite={() => setIsInviteOpen(true)}
        onOpenQR={() => setIsInviteOpen(true)}
      />

      {/* Main Content Area: Stage + Collapsible Side Panel */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <RoomStage
          watchState={watchState}
          isHost={isHost}
          roomCode={room.room_code}
          onUpdateWatchState={updateWatchState}
          onOpenAddMedia={() => setIsAddMediaOpen(true)}
          onStartScreenShare={startScreenShare}
          onStopScreenShare={stopScreenShare}
          screenStream={activeScreenStream}
          isLocallySharing={isLocallySharing}
          floatingReactions={floatingReactions}
          toastMessage={toastMessage}
          onVideoEnded={handleVideoEnded}
          messages={messages}
          isFloatingChatOpen={isFloatingChatOpen}
          onToggleFloatingChat={handleToggleFloatingChat}
          onSeekTimestamp={handleSeekTimestamp}
        />

        <SidePanel
          activeTab={activeTab}
          onClose={() => setActiveTab(null)}
          participants={participants}
          currentUserId={currentUser.userId}
          hostId={room.host_id}
          isHost={isHost}
          messages={messages}
          onSendMessage={sendMessage}
          queue={queue}
          onAddToQueue={(url) => addToQueue(url)}
          onRemoveFromQueue={removeFromQueue}
          onPlayQueueItem={playQueueItem}
          onTransferHost={transferHost}
          onQuickReaction={sendReaction}
          onSeekTimestamp={handleSeekTimestamp}
          typingUserNames={typingUserNames}
          onUserTyping={sendTyping}
        />
      </div>

      {/* Bottom Floating/Persistent Toolbar */}
      <RoomControls
        isMicMuted={isMicMuted}
        isCamMuted={isCamMuted}
        isScreenSharing={isScreenSharing}
        isSpeaking={isSpeaking}
        activeTab={activeTab}
        queueCount={queue.length}
        soundEnabled={soundEnabled}
        isFloatingChatOpen={isFloatingChatOpen}
        onToggleMic={handleToggleMic}
        onToggleCam={handleToggleCam}
        onToggleScreenShare={isScreenSharing ? stopScreenShare : startScreenShare}
        onOpenAddMedia={() => setIsAddMediaOpen(true)}
        onToggleTab={handleToggleTab}
        onOpenQR={() => setIsInviteOpen(true)}
        onQuickReaction={sendReaction}
        onToggleSound={handleToggleSound}
        onToggleFloatingChat={handleToggleFloatingChat}
      />

      {/* Invite & Multi-device QR Modal */}
      <InviteModal
        roomCode={room.room_code}
        roomName={room.name}
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
      />

      {/* Watch Together Add Media Modal */}
      <AddMediaModal
        isOpen={isAddMediaOpen}
        onClose={() => setIsAddMediaOpen(false)}
        onPlayNow={handlePlayNow}
        onAddToQueue={addToQueue}
        isHost={isHost}
      />
    </div>
  );
}
