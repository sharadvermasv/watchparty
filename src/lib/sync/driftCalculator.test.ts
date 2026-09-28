import {
  calculateExpectedTime,
  getDrift,
  evaluateSyncAction,
  parseYouTubeVideoId,
  detectMediaType,
  formatTime,
} from "./driftCalculator";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log("Running drift & YouTube parser unit tests...");

// 1. YouTube URL Parser tests
const urls = [
  { input: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", expected: "dQw4w9WgXcQ" },
  { input: "https://youtu.be/dQw4w9WgXcQ?t=43", expected: "dQw4w9WgXcQ" },
  { input: "https://www.youtube.com/embed/dQw4w9WgXcQ", expected: "dQw4w9WgXcQ" },
  { input: "https://www.youtube.com/shorts/dQw4w9WgXcQ", expected: "dQw4w9WgXcQ" },
  { input: "dQw4w9WgXcQ", expected: "dQw4w9WgXcQ" },
  { input: "https://invalid-url.com/video.mp4", expected: null },
];

for (const testCase of urls) {
  const result = parseYouTubeVideoId(testCase.input);
  assert(result === testCase.expected, `Expected ${testCase.expected} for ${testCase.input}, got ${result}`);
}
console.log("✓ YouTube URL parsing tests passed.");

// 2. detectMediaType tests
assert(detectMediaType("https://www.youtube.com/watch?v=aqz-KE-bpKQ") === "youtube", "Should detect YouTube");
assert(detectMediaType("https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8") === "hls", "Should detect HLS m3u8");
assert(detectMediaType("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4") === "direct_video", "Should detect direct MP4");
assert(detectMediaType("https://example.com/video.webm") === "direct_video", "Should detect webm");
console.log("✓ detectMediaType tests passed.");

// 3. formatTime tests
assert(formatTime(0) === "0:00", "0 should format as 0:00");
assert(formatTime(65) === "1:05", "65 should format as 1:05");
assert(formatTime(3665) === "1:01:05", "3665 should format as 1:01:05");
console.log("✓ formatTime tests passed.");

// 4. calculateExpectedTime tests
const baseState = {
  room_id: "test_room",
  mode: "watch" as const,
  media_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  media_title: "Test",
  is_playing: true,
  current_time: 100,
  updated_at: new Date(Date.now() - 5000).toISOString(), // 5 seconds ago
  updated_by: "usr_host",
};

const expected = calculateExpectedTime(baseState);
assert(Math.abs(expected - 105) < 0.2, `Expected ~105, got ${expected}`);

const pausedState = { ...baseState, is_playing: false };
assert(calculateExpectedTime(pausedState) === 100, "Paused state should return current_time");
console.log("✓ calculateExpectedTime tests passed.");

// 5. evaluateSyncAction tests
const inSync = evaluateSyncAction(0.4, 100);
assert(inSync.type === "in_sync", "0.4s drift should be in_sync");

const softSyncBehind = evaluateSyncAction(-2.0, 100);
assert(softSyncBehind.type === "soft_sync" && softSyncBehind.targetRate > 1.0, "Behind should speed up in soft_sync");

const softSyncAhead = evaluateSyncAction(2.0, 100);
assert(softSyncAhead.type === "soft_sync" && softSyncAhead.targetRate < 1.0, "Ahead should slow down in soft_sync");

const hardSync = evaluateSyncAction(5.0, 100);
assert(hardSync.type === "hard_sync" && hardSync.targetTime === 100, "Large drift should trigger hard_sync");
console.log("✓ evaluateSyncAction tests passed.");

console.log("\nALL UNIT TESTS PASSED SUCCESSFULLY! 🎉\n");
