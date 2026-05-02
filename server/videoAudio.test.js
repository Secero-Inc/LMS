import { describe, expect, it } from "vitest";
import { shouldExtractAudioFromVideo } from "./videoAudio.js";

describe("shouldExtractAudioFromVideo", () => {
  it("returns false for audio mime types", () => {
    expect(shouldExtractAudioFromVideo("audio/mpeg", "x.mp4")).toBe(false);
    expect(shouldExtractAudioFromVideo("audio/webm", "x.webm")).toBe(false);
  });

  it("returns true for video mime types", () => {
    expect(shouldExtractAudioFromVideo("video/mp4", "x.bin")).toBe(true);
  });

  it("uses extension when mime is missing or generic", () => {
    expect(shouldExtractAudioFromVideo(undefined, "clip.mp4")).toBe(true);
    expect(shouldExtractAudioFromVideo("application/octet-stream", "a.MOV")).toBe(true);
    expect(shouldExtractAudioFromVideo("", "notes.wav")).toBe(false);
  });
});
