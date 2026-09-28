"use client";

import { useEffect, useRef, useState, useCallback } from "react";

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

  // Keep callback refs stable to prevent effect re-trigger loops
  const onSpeakingRef = useRef(onParticipantSpeaking);
  onSpeakingRef.current = onParticipantSpeaking;

  const onScreenShareStartedRef = useRef(onScreenShareStarted);
  onScreenShareStartedRef.current = onScreenShareStarted;

  const onScreenShareStoppedRef = useRef(onScreenShareStopped);
  onScreenShareStoppedRef.current = onScreenShareStopped;

  const isSpeakingStateRef = useRef(false);
  const jitsiApiRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Stop Audio Meter
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
    if (isSpeakingStateRef.current) {
      isSpeakingStateRef.current = false;
      setIsSpeaking(false);
      onSpeakingRef.current?.(false);
    }
  }, []);

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
        const speaking = avg > 20;

        if (speaking !== isSpeakingStateRef.current) {
          isSpeakingStateRef.current = speaking;
          setIsSpeaking(speaking);
          onSpeakingRef.current?.(speaking);
        }
      }, 250);
    } catch (e) {
      console.warn("Audio meter init note:", e);
    }
  }, []);

  // Toggle Microphone
  const toggleMic = useCallback(async () => {
    if (isMicMuted) {
      // Unmute: request user media if needed
      try {
        let stream = localStream;
        if (!stream) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: !isCamMuted });
          setLocalStream(stream);
          startAudioMeter(stream);
        } else {
          stream.getAudioTracks().forEach((track) => {
            track.enabled = true;
          });
          startAudioMeter(stream);
        }
        setIsMicMuted(false);
        if (jitsiApiRef.current) {
          try {
            jitsiApiRef.current.executeCommand("toggleAudio");
          } catch {}
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
        try {
          jitsiApiRef.current.executeCommand("toggleAudio");
        } catch {}
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
          try {
            jitsiApiRef.current.executeCommand("toggleVideo");
          } catch {}
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
        try {
          jitsiApiRef.current.executeCommand("toggleVideo");
        } catch {}
      }
    }
  }, [isCamMuted, isMicMuted, localStream]);

  // Stop Screen Sharing
  const stopScreenShare = useCallback(() => {
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
    }
    setIsScreenSharing(false);
    onScreenShareStoppedRef.current?.();
  }, [screenStream]);

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
      onScreenShareStartedRef.current?.(stream);

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
  }, [stopScreenShare]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudioMeter();
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
      }
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose();
        } catch {}
        jitsiApiRef.current = null;
      }
    };
  }, [stopAudioMeter, localStream, screenStream]);

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
