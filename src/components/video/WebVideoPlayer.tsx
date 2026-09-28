"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  RotateCcw as SkipBack,
  RotateCw as SkipForward,
} from "lucide-react";
import { WatchState, SyncStatus } from "@/types/room";
import {
  formatTime,
  calculateExpectedTime,
  evaluateSyncAction,
  getDrift,
  detectMediaType,
} from "@/lib/sync/driftCalculator";

interface WebVideoPlayerProps {
  watchState: WatchState;
  isHost: boolean;
  onUpdateWatchState: (updates: Partial<WatchState>) => void;
  onVideoEnded?: () => void;
}

export function WebVideoPlayer({
  watchState,
  isHost,
  onUpdateWatchState,
  onVideoEnded,
}: WebVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");
  const [activePlaybackRate, setActivePlaybackRate] = useState<number>(1.0);
  const [showControls, setShowControls] = useState(true);
  const [hostWarning, setHostWarning] = useState<string | null>(null);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  // Stable references
  const watchStateRef = useRef(watchState);
  watchStateRef.current = watchState;

  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;

  const onUpdateWatchStateRef = useRef(onUpdateWatchState);
  onUpdateWatchStateRef.current = onUpdateWatchState;

  const onVideoEndedRef = useRef(onVideoEnded);
  onVideoEndedRef.current = onVideoEnded;

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);
  const currentMediaUrlRef = useRef<string | null>(null);

  const mediaUrl = watchState.media_url || "";
  const mediaType = detectMediaType(mediaUrl);

  // Initialize and load video stream (HLS or Native MP4)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !mediaUrl) return;

    if (currentMediaUrlRef.current === mediaUrl) return;
    currentMediaUrlRef.current = mediaUrl;

    // Clean up previous HLS instance if any
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (mediaType === "hls") {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hlsRef.current = hls;
        hls.loadSource(mediaUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const expected = calculateExpectedTime(watchStateRef.current);
          video.currentTime = expected;
          if (watchStateRef.current.is_playing) {
            video.play().catch(() => setIsAutoplayBlocked(true));
          }
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                break;
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Native Safari/iOS HLS
        video.src = mediaUrl;
        const expected = calculateExpectedTime(watchStateRef.current);
        video.currentTime = expected;
        if (watchStateRef.current.is_playing) {
          video.play().catch(() => setIsAutoplayBlocked(true));
        }
      }
    } else {
      // Standard Direct MP4 / WebM
      video.src = mediaUrl;
      video.load();
      const expected = calculateExpectedTime(watchStateRef.current);
      video.currentTime = expected;
      if (watchStateRef.current.is_playing) {
        video.play().catch(() => setIsAutoplayBlocked(true));
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [mediaUrl, mediaType]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime || 0);
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
    };

    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => {
      setIsBuffering(false);
      setIsAutoplayBlocked(false);
    };

    const handleEnded = () => {
      if (isHostRef.current) {
        onVideoEndedRef.current?.();
      }
    };

    const handlePlay = () => {
      if (!isHostRef.current) return;
      if (!watchStateRef.current.is_playing) {
        onUpdateWatchStateRef.current({
          is_playing: true,
          current_time: video.currentTime,
        });
      }
    };

    const handlePause = () => {
      if (!isHostRef.current) return;
      if (watchStateRef.current.is_playing) {
        onUpdateWatchStateRef.current({
          is_playing: false,
          current_time: video.currentTime,
        });
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, []);

  // Guest synchronization loop
  useEffect(() => {
    if (isHost || !mediaUrl) {
      setSyncStatus("synced");
      setActivePlaybackRate(1.0);
      return;
    }

    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video || isSyncingRef.current) return;

      try {
        const state = watchStateRef.current;
        const expected = calculateExpectedTime(state);
        const current = video.currentTime || 0;
        const drift = getDrift(current, expected);
        const action = evaluateSyncAction(drift, expected);

        if (action.type === "in_sync") {
          setSyncStatus("synced");
          setActivePlaybackRate(1.0);
          video.playbackRate = 1.0;
        } else if (action.type === "soft_sync") {
          setSyncStatus("syncing");
          setActivePlaybackRate(action.targetRate);
          video.playbackRate = action.targetRate;
        } else if (action.type === "hard_sync") {
          setSyncStatus("syncing");
          isSyncingRef.current = true;
          video.currentTime = action.targetTime;
          video.playbackRate = 1.0;
          setActivePlaybackRate(1.0);
          setTimeout(() => {
            isSyncingRef.current = false;
            setSyncStatus("synced");
          }, 800);
        }

        // Match play / pause state
        if (state.is_playing && video.paused) {
          video.play().catch(() => setIsAutoplayBlocked(true));
        } else if (!state.is_playing && !video.paused) {
          video.pause();
        }
      } catch {}
    }, 2000);

    return () => clearInterval(interval);
  }, [isHost, mediaUrl]);

  // Tap-to-play handler for mobile gesture requirement
  const handleManualPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    try {
      video.muted = false;
      video.volume = 0.8;
      setIsMuted(false);
      video.play().catch(() => {});
      setIsAutoplayBlocked(false);

      const expected = calculateExpectedTime(watchStateRef.current);
      video.currentTime = expected;
    } catch {}
  }, []);

  // Manual "Sync me" button
  const handleSyncMe = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const expected = calculateExpectedTime(watchStateRef.current);
    video.currentTime = expected;
    if (watchStateRef.current.is_playing) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
    video.playbackRate = 1.0;
    setActivePlaybackRate(1.0);
    setSyncStatus("synced");
  }, []);

  // Play / Pause toggle
  const handleTogglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isHostRef.current && watchStateRef.current.is_playing) {
      handleManualPlay();
      return;
    }

    if (!isHostRef.current) {
      setHostWarning("Only the host can pause/resume playback.");
      setTimeout(() => setHostWarning(null), 3000);
      return;
    }

    if (watchStateRef.current.is_playing) {
      video.pause();
      onUpdateWatchStateRef.current({
        is_playing: false,
        current_time: video.currentTime,
      });
    } else {
      video.muted = false;
      video.play().catch(() => {});
      onUpdateWatchStateRef.current({
        is_playing: true,
        current_time: video.currentTime,
      });
    }
  }, [handleManualPlay]);

  // Quick Skip Forward / Backward 10s (Host only)
  const handleSkip = useCallback(
    (deltaSeconds: number) => {
      if (!isHostRef.current) {
        setHostWarning("Only the host can skip video time.");
        setTimeout(() => setHostWarning(null), 3000);
        return;
      }
      const video = videoRef.current;
      if (!video) return;

      const target = Math.max(0, Math.min(video.duration || 9999, video.currentTime + deltaSeconds));
      video.currentTime = target;
      setCurrentTime(target);
      onUpdateWatchStateRef.current({
        current_time: target,
      });
    },
    []
  );

  // Seek bar
  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    if (!isHost) {
      setHostWarning("Only the host can seek the video. Use 'Sync me' to match host.");
      setTimeout(() => setHostWarning(null), 3000);
      return;
    }

    setCurrentTime(target);
    const video = videoRef.current;
    if (video) {
      video.currentTime = target;
      onUpdateWatchStateRef.current({
        current_time: target,
      });
    }
  };

  // Volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setVolume(val);
    const video = videoRef.current;
    if (!video) return;

    if (val === 0) {
      setIsMuted(true);
      video.muted = true;
    } else {
      setIsMuted(false);
      video.muted = false;
      video.volume = val / 100;
    }
  };

  const handleToggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      setIsMuted(false);
      video.muted = false;
      video.volume = (volume || 50) / 100;
    } else {
      setIsMuted(true);
      video.muted = true;
    }
  }, [isMuted, volume]);

  const handleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current.requestFullscreen().catch(() => {});
    }
  }, []);

  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (watchStateRef.current.is_playing) {
        setShowControls(false);
      }
    }, 3500);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;

      if (e.code === "Space") {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === "KeyM") {
        e.preventDefault();
        handleToggleMute();
      } else if (e.code === "KeyF") {
        e.preventDefault();
        handleFullscreen();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handleSkip(-10);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleSkip(10);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleTogglePlay, handleToggleMute, handleFullscreen, handleSkip]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
      className="relative w-full h-full bg-black overflow-hidden group select-none flex items-center justify-center"
    >
      <video
        ref={videoRef}
        playsInline
        className="w-full h-full object-contain"
        onClick={handleTogglePlay}
      />

      {/* Buffering Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="w-12 h-12 rounded-full border-4 border-[#FF5733]/30 border-t-[#FF5733] animate-spin" />
        </div>
      )}

      {/* Mobile Autoplay Blocked Banner */}
      {isAutoplayBlocked && (
        <div
          onClick={handleManualPlay}
          className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center cursor-pointer p-6 text-center animate-fade-in"
        >
          <div className="relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-[#FF5733] to-[#ff8c42] rounded-full blur-xl opacity-75 animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-[#FF5733] hover:bg-[#ff6e4d] flex items-center justify-center text-white mb-4 shadow-2xl transition transform hover:scale-105 active:scale-95">
              <Play className="w-10 h-10 fill-current ml-1" />
            </div>
          </div>
          <p className="text-lg font-bold text-white tracking-tight">Tap to Start Watching</p>
          <p className="text-xs text-[#A7ABB5] mt-1.5 max-w-xs leading-relaxed">
            Mobile browsers require a touch gesture to enable synchronized audio & video playback.
          </p>
        </div>
      )}

      {/* Host warning notification */}
      {hostWarning && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-[#151820]/95 border border-[#FF5733]/40 text-[#FF5733] px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2 shadow-2xl backdrop-blur-md animate-fade-in">
          <ShieldAlert className="w-4 h-4" />
          <span>{hostWarning}</span>
        </div>
      )}

      {/* Cinema Overlay & Controls */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40 transition-opacity duration-300 pointer-events-none ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Top bar info */}
        <div className="absolute top-4 left-4 right-4 sm:left-6 sm:right-6 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 mr-2">
            <span className="text-[10px] sm:text-xs uppercase tracking-widest font-semibold px-2.5 py-1 rounded bg-[#FF5733]/20 text-[#FF5733] border border-[#FF5733]/30 shrink-0">
              {mediaType === "hls" ? "HLS Stream" : "Web Video"}
            </span>
            <h2 className="text-xs sm:text-sm font-medium text-white/90 truncate max-w-[140px] sm:max-w-md">
              {watchState.media_title || "Video Playback"}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {syncStatus === "synced" ? (
              <span className="flex items-center gap-1.5 text-[11px] sm:text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-full backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Synced
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-[11px] sm:text-xs text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2.5 py-1 rounded-full backdrop-blur-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  {activePlaybackRate !== 1.0 ? `${activePlaybackRate}x Sync` : "Syncing…"}
                </span>
                <button
                  onClick={handleSyncMe}
                  className="flex items-center gap-1 text-[11px] sm:text-xs bg-[#FF5733] hover:bg-[#ff6e4d] text-white px-2.5 py-1 rounded-full font-medium transition cursor-pointer shadow-lg"
                >
                  <RotateCcw className="w-3 h-3" />
                  Sync me
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Cinema Control Strip */}
        <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-6 flex flex-col gap-2.5 pointer-events-auto">
          {/* Progress Seek Bar */}
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
            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden transition-all group-hover/track:h-2 backdrop-blur-sm">
              <div
                className="h-full bg-gradient-to-r from-[#FF5733] to-[#ff7b47] relative rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div
              className="absolute w-3.5 h-3.5 bg-white rounded-full shadow-lg pointer-events-none transition-all scale-0 group-hover/track:scale-100"
              style={{ left: `calc(${progressPercent}% - 7px)` }}
            />
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Play / Pause */}
              <button
                onClick={handleTogglePlay}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-[#FF5733] text-white transition cursor-pointer backdrop-blur-md"
                title={isHost ? (watchState.is_playing ? "Pause (Space)" : "Play (Space)") : "Play/Sync Video"}
              >
                {watchState.is_playing ? (
                  <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                ) : (
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
                )}
              </button>

              {/* Host Skip -10s / +10s */}
              {isHost && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleSkip(-10)}
                    className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                    title="Skip backward 10s (←)"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleSkip(10)}
                    className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                    title="Skip forward 10s (→)"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Current Time / Duration */}
              <div className="text-[11px] sm:text-xs text-white/80 font-mono tracking-tight pl-1">
                <span className="text-white font-medium">{formatTime(currentTime)}</span>
                <span className="text-white/40 mx-1">/</span>
                <span className="text-white/60">{formatTime(duration)}</span>
              </div>

              {/* Volume Slider */}
              <div className="hidden sm:flex items-center gap-2 group/volume pl-2">
                <button
                  onClick={handleToggleMute}
                  className="text-white/70 hover:text-white transition cursor-pointer"
                  title="Toggle Mute (M)"
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
                  className="text-[11px] sm:text-xs text-white/70 hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 backdrop-blur-md transition cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-[#FF5733]" />
                  Sync me
                </button>
              )}

              {/* Fullscreen Button */}
              <button
                onClick={handleFullscreen}
                className="p-1.5 sm:p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
                title="Fullscreen (F)"
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
