"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Participant } from "@/types/room";

interface UseJitsiProps {
  roomCode: string;
  userName: string;
  onParticipantSpeaking?: (isSpeaking: boolean) => void;
  onScreenShareStarted?: (stream: MediaStream) => void;
  onScreenShareStopped?: () => void;
}

export function useJitsi({
  roomCode,
  userName,
  onParticipantSpeaking,
  onScreenShareStarted,
  onScreenShareStopped,
}: UseJitsiProps) {
  const [isMicMuted, setIsMicMuted] = useState(true);
  const [isCamMuted, setIsCamMuted] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  const jitsiApiRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize native microphone audio level analysis for speaking indicator
  const startAudioMeter = useCallback((stream: MediaStream) => {
    try {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const speaking = avg > 18; // threshold for voice
        setIsSpeaking(speaking);
        onParticipantSpeaking?.(speaking);
      }, 200);
    } catch (e) {
      console.warn("Audio meter init error:", e);
    }
  }, [onParticipantSpeaking]);

  const stopAudioMeter = useCallback(() => {
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    setIsSpeaking(false);
    onParticipantSpeaking?.(false);
  }, [onParticipantSpeaking]);

  // Toggle Microphone
  const toggleMic = useCallback(async () => {
    if (isMicMuted) {
      // Unmute: request user media if needed
      try {
        if (!localStream) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: !isCamMuted });
          setLocalStream(stream);
          startAudioMeter(stream);
        } else {
          localStream.getAudioTracks().forEach((track) => {
            track.enabled = true;
          });
          startAudioMeter(localStream);
        }
        setIsMicMuted(false);
        if (jitsiApiRef.current) {
          jitsiApiRef.current.executeCommand("toggleAudio");
        }
      } catch (err) {
        console.warn("Could not access microphone:", err);
      }
    } else {
      // Mute
      if (localStream) {
        localStream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      stopAudioMeter();
      setIsMicMuted(true);
      if (jitsiApiRef.current) {
        jitsiApiRef.current.executeCommand("toggleAudio");
      }
    }
  }, [isMicMuted, isCamMuted, localStream, startAudioMeter, stopAudioMeter]);

  // Toggle Camera
  const toggleCam = useCallback(async () => {
    if (isCamMuted) {
      // Turn on camera
      try {
        let stream = localStream;
        if (!stream) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: !isMicMuted });
          setLocalStream(stream);
        } else {
          // If stream only had audio, add video track
          if (stream.getVideoTracks().length === 0) {
            const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
            const videoTrack = videoStream.getVideoTracks()[0];
            stream.addTrack(videoTrack);
          } else {
            stream.getVideoTracks().forEach((track) => {
              track.enabled = true;
            });
          }
        }
        setIsCamMuted(false);
        if (jitsiApiRef.current) {
          jitsiApiRef.current.executeCommand("toggleVideo");
        }
      } catch (err) {
        console.warn("Could not access camera:", err);
      }
    } else {
      // Turn off camera
      if (localStream) {
        localStream.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
      }
      setIsCamMuted(true);
      if (jitsiApiRef.current) {
        jitsiApiRef.current.executeCommand("toggleVideo");
      }
    }
  }, [isCamMuted, isMicMuted, localStream]);

  // Start Screen Sharing via getDisplayMedia
  const startScreenShare = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error("Screen sharing not supported on this device/browser");
      }

      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: {
          cursor: "always",
        },
        audio: true,
      });

      setScreenStream(stream);
      setIsScreenSharing(true);
      onScreenShareStarted?.(stream);

      // Listen for when user clicks native "Stop sharing" chrome
      const track = stream.getVideoTracks()[0];
      if (track) {
        track.onended = () => {
          stopScreenShare();
        };
      }
    } catch (err) {
      console.warn("Screen share cancelled or failed:", err);
    }
  }, [onScreenShareStarted]);

  // Stop Screen Sharing
  const stopScreenShare = useCallback(() => {
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
    }
    setIsScreenSharing(false);
    onScreenShareStopped?.();
  }, [screenStream, onScreenShareStopped]);

  // Optional Jitsi Meet External API integration in background
  useEffect(() => {
    if (typeof window === "undefined") return;

    const jitsiDomain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.jit.si";
    const jitsiRoomName = `WatchParty_${roomCode.toUpperCase()}`;

    // Dynamically load external_api.js
    const script = document.createElement("script");
    script.src = `https://${jitsiDomain}/external_api.js`;
    script.async = true;

    script.onload = () => {
      try {
        const JitsiMeetExternalAPI = (window as any).JitsiMeetExternalAPI;
        if (!JitsiMeetExternalAPI) return;

        // Create container if not exists
        let hiddenContainer = document.getElementById("jitsi-hidden-container");
        if (!hiddenContainer) {
          hiddenContainer = document.createElement("div");
          hiddenContainer.id = "jitsi-hidden-container";
          hiddenContainer.style.position = "fixed";
          hiddenContainer.style.bottom = "-9999px";
          hiddenContainer.style.left = "-9999px";
          hiddenContainer.style.width = "1px";
          hiddenContainer.style.height = "1px";
          hiddenContainer.style.opacity = "0";
          hiddenContainer.style.pointerEvents = "none";
          document.body.appendChild(hiddenContainer);
        }

        const options = {
          roomName: jitsiRoomName,
          parentNode: hiddenContainer,
          userInfo: {
            displayName: userName,
          },
          configOverwrite: {
            startWithAudioMuted: true,
            startWithVideoMuted: true,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [],
            SHOW_JITSI_WATERMARK: false,
          },
        };

        const api = new JitsiMeetExternalAPI(jitsiDomain, options);
        jitsiApiRef.current = api;

        api.addEventListener("dominantSpeakerChanged", (e: any) => {
          // If we are dominant speaker
        });
      } catch (e) {
        console.warn("Jitsi Meet init note:", e);
      }
    };

    document.body.appendChild(script);

    return () => {
      stopAudioMeter();
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose();
        } catch {}
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [roomCode, userName, stopAudioMeter]);

  return {
    isMicMuted,
    isCamMuted,
    isScreenSharing,
    isSpeaking,
    localStream,
    screenStream,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
  };
}
