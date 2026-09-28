"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { WatchState, SyncStatus } from "@/types/room";
import { calculateExpectedTime, getDrift, evaluateSyncAction } from "@/lib/sync/driftCalculator";

interface UseWatchSyncProps {
  watchState: WatchState;
  isHost: boolean;
  onHostUpdateState: (updates: Partial<WatchState>) => void;
  getCurrentPlayerTime: () => number;
  seekPlayer: (seconds: number) => void;
  setPlayerRate: (rate: number) => void;
  setPlayerPlaying: (play: boolean) => void;
}

export function useWatchSync({
  watchState,
  isHost,
  onHostUpdateState,
  getCurrentPlayerTime,
  seekPlayer,
  setPlayerRate,
  setPlayerPlaying,
}: UseWatchSyncProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
  const [driftSeconds, setDriftSeconds] = useState(0);
  const isSyncingRef = useRef(false);

  // Manual "Sync me" button
  const syncMe = useCallback(() => {
    const expected = calculateExpectedTime(watchState);
    seekPlayer(expected);
    setPlayerPlaying(watchState.is_playing);
    setPlayerRate(1.0);
    setSyncStatus("synced");
  }, [watchState, seekPlayer, setPlayerPlaying, setPlayerRate]);

  // Periodic drift check for non-hosts
  useEffect(() => {
    if (isHost || !watchState.media_url || watchState.mode !== "watch") {
      setSyncStatus("synced");
      return;
    }

    const interval = setInterval(() => {
      if (isSyncingRef.current) return;

      const expected = calculateExpectedTime(watchState);
      const current = getCurrentPlayerTime();
      if (isNaN(current) || current <= 0 && expected > 3) {
        // Player might still be buffering
        setSyncStatus("syncing");
        return;
      }

      const drift = getDrift(current, expected);
      setDriftSeconds(drift);

      const decision = evaluateSyncAction(drift, expected);

      if (decision.type === "in_sync") {
        setSyncStatus("synced");
        setPlayerRate(1.0);
      } else if (decision.type === "soft_sync") {
        setSyncStatus("syncing");
        setPlayerRate(decision.targetRate);
      } else if (decision.type === "hard_sync") {
        setSyncStatus("syncing");
        isSyncingRef.current = true;
        seekPlayer(decision.targetTime);
        setPlayerRate(1.0);
        setTimeout(() => {
          isSyncingRef.current = false;
          setSyncStatus("synced");
        }, 800);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [isHost, watchState, getCurrentPlayerTime, seekPlayer, setPlayerRate]);

  // When host updates playback state (play/pause), reflect immediately
  useEffect(() => {
    if (isHost || watchState.mode !== "watch") return;

    setPlayerPlaying(watchState.is_playing);
  }, [isHost, watchState.is_playing, watchState.mode, setPlayerPlaying]);

  // Host action handlers
  const handleHostPlay = useCallback((currentTime: number) => {
    if (!isHost) return;
    onHostUpdateState({
      is_playing: true,
      current_time: currentTime,
    });
  }, [isHost, onHostUpdateState]);

  const handleHostPause = useCallback((currentTime: number) => {
    if (!isHost) return;
    onHostUpdateState({
      is_playing: false,
      current_time: currentTime,
    });
  }, [isHost, onHostUpdateState]);

  const handleHostSeek = useCallback((newTime: number) => {
    if (!isHost) return;
    onHostUpdateState({
      current_time: newTime,
    });
  }, [isHost, onHostUpdateState]);

  return {
    syncStatus,
    driftSeconds,
    syncMe,
    handleHostPlay,
    handleHostPause,
    handleHostSeek,
  };
}
