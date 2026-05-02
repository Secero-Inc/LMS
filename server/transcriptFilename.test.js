import { describe, expect, it } from "vitest";
import { transcriptJsonFilename } from "./transcriptFilename.js";

describe("transcriptJsonFilename", () => {
  it("uses basename stem with .json", () => {
    expect(transcriptJsonFilename("/evil/path/lecture.mp3")).toBe("lecture.json");
  });

  it("sanitizes unsafe characters", () => {
    expect(transcriptJsonFilename("hello world!.wav")).toBe("hello_world.json");
  });

  it("handles missing extension", () => {
    expect(transcriptJsonFilename("notes")).toBe("notes.json");
  });
});
