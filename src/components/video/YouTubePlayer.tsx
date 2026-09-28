"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, ShieldAlert, Sparkles, VolumeOff } from "lucide-react";
import { WatchState, SyncStatus } from "@/types/room";
import { parseYouTubeVideoId, formatTime, calculateExpectedTime, evaluateSyncAction, getDrift } from "@/lib/sync/driftCalculator";

interface YouTubePlayerProps {
  watchState: WatchState;
  isHost: boolean;
  onUpdateWatchState: (updates: Partial<WatchState>) => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function YouTubePlayer({ watchState, isHost, onUpdateWatchState }: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
  const [showControls, setShowControls] = useState(true);
  const [hostWarning, setHostWarning] = useState<string | null>(null);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);

  // Stable references
  const watchStateRef = useRef(watchState);
  watchStateRef.current = watchState;

  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;

  const onUpdateWatchStateRef = useRef(onUpdateWatchState);
  onUpdateWatchStateRef.current = onUpdateWatchState;

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);
  const videoId = parseYouTubeVideoId(watchState.media_url || "");
  const currentVideoIdRef = useRef<string | null>(null);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    } else if (window.YT && window.YT.Player) {
      initPlayer();
    }

    function initPlayer() {
      if (!videoId || playerRef.current) return;
      currentVideoIdRef.current = videoId;

      // Start muted to comply with mobile autoplay policies
      playerRef.current = new window.YT.Player("yt-player-target", {
        height: "100%",
        width: "100%",
        videoId: videoId,
        playerVars: {
          autoplay: watchStateRef.current.is_playing ? 1 : 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          mute: 1, // Required for mobile autoplay!
        },
        events: {
          onReady: (event: any) => {
            setIsPlayerReady(true);
            setDuration(event.target.getDuration() || 0);

            const expected = calculateExpectedTime(watchStateRef.current);
            event.target.seekTo(expected, true);

            if (watchStateRef.current.is_playing) {
              const playPromise = event.target.playVideo();
              // Check if autoplay was blocked by browser
              setTimeout(() => {
                const state = event.target.getPlayerState?.();
                if (state !== 1 && state !== 3) {
                  setIsAutoplayBlocked(true);
                }
              }, 1200);
            } else {
              event.target.pauseVideo();
            }
          },
          onStateChange: (event: any) => {
            if (event.data === 1) {
              setIsAutoplayBlocked(false);
            }

            if (!isHostRef.current) return;
            // 1: PLAYING, 2: PAUSED
            if (event.data === 1 && !watchStateRef.current.is_playing) {
              onUpdateWatchStateRef.current({
                is_playing: true,
                current_time: event.target.getCurrentTime(),
              });
            } else if (event.data === 2 && watchStateRef.current.is_playing) {
              onUpdateWatchStateRef.current({
                is_playing: false,
                current_time: event.target.getCurrentTime(),
              });
            }
          },
        },
      });
    }

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
    };
  }, [videoId]);

  // Load new video when videoId changes
  useEffect(() => {
    if (isPlayerReady && playerRef.current && videoId && videoId !== currentVideoIdRef.current) {
      currentVideoIdRef.current = videoId;
      playerRef.current.loadVideoById(videoId, 0);
      if (watchStateRef.current.is_playing) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    }
  }, [videoId, isPlayerReady]);

  // Track playback time
  useEffect(() => {
    if (!isPlayerReady || !playerRef.current) return;

    const interval = setInterval(() => {
      try {
        const time = playerRef.current.getCurrentTime() || 0;
        setCurrentTime(time);
        const dur = playerRef.current.getDuration() || 0;
        if (dur > 0 && dur !== duration) {
          setDuration(dur);
        }
      } catch {}
    }, 500);

    return () => clearInterval(interval);
  }, [isPlayerReady, duration]);

  // Non-host synchronization reconciliation
  useEffect(() => {
    if (isHost || !isPlayerReady || !playerRef.current || !watchState.media_url) {
      setSyncStatus("synced");
      return;
    }

    const interval = setInterval(() => {
      if (isSyncingRef.current) return;

      try {
        const state = watchStateRef.current;
        const expected = calculateExpectedTime(state);
        const current = playerRef.current.getCurrentTime() || 0;
        const drift = getDrift(current, expected);
        const action = evaluateSyncAction(drift, expected);

        if (action.type === "in_sync") {
          setSyncStatus("synced");
          playerRef.current.setPlaybackRate?.(1.0);
        } else if (action.type === "soft_sync") {
          setSyncStatus("syncing");
          playerRef.current.setPlaybackRate?.(action.targetRate);
        } else if (action.type === "hard_sync") {
          setSyncStatus("syncing");
          isSyncingRef.current = true;
          playerRef.current.seekTo(action.targetTime, true);
          playerRef.current.setPlaybackRate?.(1.0);
          setTimeout(() => {
            isSyncingRef.current = false;
            setSyncStatus("synced");
          }, 800);
        }

        // Match play / pause state
        const playerState = playerRef.current.getPlayerState?.();
        if (state.is_playing && playerState !== 1 && playerState !== 3) {
          playerRef.current.playVideo();
        } else if (!state.is_playing && playerState === 1) {
          playerRef.current.pauseVideo();
        }
      } catch {}
    }, 2000);

    return () => clearInterval(interval);
  }, [isHost, isPlayerReady, watchState.media_url]);

  // Tap-to-play handler for mobile gesture requirement
  const handleManualPlay = useCallback(() => {
    if (!playerRef.current) return;
    try {
      playerRef.current.unMute();
      playerRef.current.setVolume(80);
      setIsMuted(false);
      playerRef.current.playVideo();
      setIsAutoplayBlocked(false);

      const expected = calculateExpectedTime(watchStateRef.current);
      playerRef.current.seekTo(expected, true);
    } catch (e) {
      console.warn("Manual play error:", e);
    }
  }, []);

  // Manual "Sync me" button
  const handleSyncMe = useCallback(() => {
    if (!playerRef.current) return;
    const expected = calculateExpectedTime(watchStateRef.current);
    playerRef.current.seekTo(expected, true);
    if (watchStateRef.current.is_playing) {
      playerRef.current.playVideo();
    } else {
      playerRef.current.pauseVideo();
    }
    playerRef.current.setPlaybackRate?.(1.0);
    setSyncStatus("synced");
  }, []);

  // Play / Pause toggle
  const handleTogglePlay = () => {
    if (!playerRef.current) return;

    // If mobile blocked or paused while host is playing, allow user to resume locally
    if (!isHost && watchState.is_playing) {
      handleManualPlay();
      return;
    }

    if (!isHost) {
      setHostWarning("Only the host can pause/resume playback.");
      setTimeout(() => setHostWarning(null), 3000);
      return;
    }

    if (watchState.is_playing) {
      playerRef.current.pauseVideo();
      onUpdateWatchStateRef.current({
        is_playing: false,
        current_time: playerRef.current.getCurrentTime(),
      });
    } else {
      playerRef.current.unMute();
      playerRef.current.playVideo();
      onUpdateWatchStateRef.current({
        is_playing: true,
        current_time: playerRef.current.getCurrentTime(),
      });
    }
  };

  // Seek bar
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    if (!isHost) {
      setHostWarning("Only the host can seek the video. Use 'Sync me' to match host.");
      setTimeout(() => setHostWarning(null), 3000);
      return;
    }

    setCurrentTime(target);
    if (playerRef.current) {
      playerRef.current.seekTo(target, true);
      onUpdateWatchStateRef.current({
        current_time: target,
      });
    }
  };

  // Volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
    if (val === 0) {
      setIsMuted(true);
      playerRef.current?.mute();
    } else {
      setIsMuted(false);
      playerRef.current?.unMute();
      playerRef.current?.setVolume(val);
    }
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      playerRef.current?.unMute();
      playerRef.current?.setVolume(volume || 50);
    } else {
      setIsMuted(true);
      playerRef.current?.mute();
    }
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (watchStateRef.current.is_playing) {
        setShowControls(false);
      }
    }, 3500);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
      className="relative w-full h-full bg-black overflow-hidden group select-none flex items-center justify-center"
    >
      <div id="yt-player-target" className="w-full h-full" />

      {/* Mobile Autoplay Blocked Banner */}
      {isAutoplayBlocked && (
        <div
          onClick={handleManualPlay}
          className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center cursor-pointer p-6 text-center animate-fade-in"
        >
          <div className="w-16 h-16 rounded-full bg-[#FF5733] hover:bg-[#ff6e4d] flex items-center justify-center text-white mb-3 shadow-2xl shadow-[#FF5733]/40 transition transform hover:scale-105 active:scale-95">
            <Play className="w-8 h-8 fill-current ml-1" />
          </div>
          <p className="text-base font-bold text-white tracking-tight">Tap to Start Watching</p>
          <p className="text-xs text-[#A7ABB5] mt-1 max-w-xs">
            Mobile browsers require a tap to enable synchronized audio and video.
          </p>
        </div>
      )}

      {hostWarning && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-[#151820]/95 border border-[#FF5733]/40 text-[#FF5733] px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2 shadow-xl backdrop-blur-md animate-fade-in">
          <ShieldAlert className="w-4 h-4" />
          <span>{hostWarning}</span>
        </div>
      )}

      {/* Cinema Overlay & Controls */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 transition-opacity duration-300 pointer-events-none ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Top bar info */}
        <div className="absolute top-4 left-4 right-4 sm:left-6 sm:right-6 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 mr-2">
            <span className="text-[10px] sm:text-xs uppercase tracking-widest font-semibold px-2 sm:px-2.5 py-1 rounded bg-[#FF5733]/20 text-[#FF5733] border border-[#FF5733]/30 shrink-0">
              Watch Together
            </span>
            <h2 className="text-xs sm:text-sm font-medium text-white/90 truncate max-w-[140px] sm:max-w-md">
              {watchState.media_title || "YouTube Playback"}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {syncStatus === "synced" ? (
              <span className="flex items-center gap-1.5 text-[11px] sm:text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 sm:px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Synced
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-[11px] sm:text-xs text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 sm:px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  Syncing…
                </span>
                <button
                  onClick={handleSyncMe}
                  className="flex items-center gap-1 text-[11px] sm:text-xs bg-[#FF5733] hover:bg-[#ff6e4d] text-white px-2 sm:px-2.5 py-1 rounded-full font-medium transition cursor-pointer shadow-lg"
                >
                  <RotateCcw className="w-3 h-3" />
                  Sync me
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Cinema Control Strip */}
        <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-6 flex flex-col gap-2 pointer-events-auto">
          <div className="relative group/track flex items-center w-full h-4 sm:h-3 cursor-pointer">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.5}
              value={currentTime}
              onChange={handleSeekChange}
              className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer"
            />
            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden transition-all group-hover/track:h-2">
              <div
                className="h-full bg-[#FF5733] relative rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div
              className="absolute w-3.5 h-3.5 bg-white rounded-full shadow-md pointer-events-none transition-all scale-0 group-hover/track:scale-100"
              style={{ left: `calc(${progressPercent}% - 7px)` }}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={handleTogglePlay}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-[#FF5733] text-white transition cursor-pointer"
                title={isHost ? (watchState.is_playing ? "Pause" : "Play") : "Play/Sync Video"}
              >
                {watchState.is_playing ? (
                  <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                ) : (
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
                )}
              </button>

              <div className="text-[11px] sm:text-xs text-white/80 font-mono tracking-tight">
                <span className="text-white font-medium">{formatTime(currentTime)}</span>
                <span className="text-white/40 mx-1">/</span>
                <span className="text-white/60">{formatTime(duration)}</span>
              </div>

              <div className="hidden sm:flex items-center gap-2 group/volume pl-2">
                <button
                  onClick={handleToggleMute}
                  className="text-white/70 hover:text-white transition cursor-pointer"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 accent-[#FF5733] bg-white/20 rounded cursor-pointer opacity-80 hover:opacity-100 transition"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {!isHost && (
                <button
                  onClick={handleSyncMe}
                  className="text-[11px] sm:text-xs text-white/60 hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-[#FF5733]" />
                  Sync me
                </button>
              )}

              <button
                onClick={handleFullscreen}
                className="p-1.5 sm:p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                title="Fullscreen"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
