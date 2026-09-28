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

export default function RoomPage() {
  const params = useParams();
  const roomCode = ((params?.code as string) || "").toUpperCase();

  const [activeTab, setActiveTab] = useState<"chat" | "people" | "queue" | null>("chat");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isAddMediaOpen, setIsAddMediaOpen] = useState(false);

  const {
    currentUser,
    room,
    isHost,
    participants,
    watchState,
    queue,
    messages,
    floatingReactions,
    isLoading,
    toastMessage,
    updateWatchState,
    updateMyParticipantStatus,
    addToQueue,
    removeFromQueue,
    playQueueItem,
    sendMessage,
    sendReaction,
    transferHost,
  } = useRoom({ roomCode });

  // Stable callbacks for Jitsi events
  const handleParticipantSpeaking = useCallback(
    (speaking: boolean) => {
      updateMyParticipantStatus({ is_speaking: speaking });
    },
    [updateMyParticipantStatus]
  );

  const handleScreenShareStarted = useCallback(
    () => {
      updateMyParticipantStatus({ is_sharing: true });
      updateWatchState({
        mode: "screen",
        media_url: null,
      });
    },
    [updateMyParticipantStatus, updateWatchState]
  );

  const handleScreenShareStopped = useCallback(() => {
    updateMyParticipantStatus({ is_sharing: false });
    updateWatchState({
      mode: "idle",
    });
  }, [updateMyParticipantStatus, updateWatchState]);

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

  if (isLoading || !room || !currentUser) {
    return (
      <div className="min-h-screen bg-[#08090B] flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-2xl bg-[#FF5733] flex items-center justify-center font-black text-xl mb-4 animate-bounce">
          WP
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
          screenStream={screenStream}
          floatingReactions={floatingReactions}
          toastMessage={toastMessage}
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
        onToggleMic={handleToggleMic}
        onToggleCam={handleToggleCam}
        onToggleScreenShare={isScreenSharing ? stopScreenShare : startScreenShare}
        onOpenAddMedia={() => setIsAddMediaOpen(true)}
        onToggleTab={handleToggleTab}
        onOpenQR={() => setIsInviteOpen(true)}
        onQuickReaction={sendReaction}
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
