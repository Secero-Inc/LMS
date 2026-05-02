import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile);

const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".mov",
  ".mkv",
  ".webm",
  ".m4v",
  ".avi",
  ".wmv",
  ".flv",
  ".mpeg",
  ".mpg",
  ".3gp",
]);

/**
 * When true, buffer should be passed through ffmpeg to extract an audio track before STT.
 * @param {string | undefined} mimetype
 * @param {string | undefined} originalname
 */
export function shouldExtractAudioFromVideo(mimetype, originalname) {
  const mt = (mimetype || "").toLowerCase();
  if (mt.startsWith("audio/")) {
    return false;
  }
  if (mt.startsWith("video/")) {
    return true;
  }
  const ext = path.extname(originalname || "").toLowerCase();
  return VIDEO_EXTENSIONS.has(ext);
}

/**
 * Extract compact mono MP3 from a video (or any media) file on disk.
 * Keeps large raw footage and extracted audio out of app memory.
 * @param {string} inputPath path to uploaded video/container file
 * @returns {Promise<{ audioPath: string, cleanup: () => Promise<void> }>}
 */
export async function extractAudioWithFfmpegToPath(inputPath) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "lms-audio-"));
  const outputPath = path.join(dir, "audio.mp3");
  try {
    await execFileAsync(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        inputPath,
        "-vn",
        "-ar",
        "16000",
        "-ac",
        "1",
        "-codec:a",
        "libmp3lame",
        "-b:a",
        "64k",
        outputPath,
      ],
      { maxBuffer: 10 * 1024 * 1024 }
    );
    return {
      audioPath: outputPath,
      cleanup: () => fs.rm(dir, { recursive: true, force: true }),
    };
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? err.code : undefined;
    await fs.rm(dir, { recursive: true, force: true });
    if (code === "ENOENT") {
      throw new Error(
        "ffmpeg not found. Install ffmpeg (e.g. brew install ffmpeg) and ensure it is on PATH."
      );
    }
    const stderr =
      err && typeof err === "object" && "stderr" in err
        ? String((/** @type {{ stderr?: Buffer }} */ (err)).stderr || "")
        : "";
    const msg = stderr.trim() || (err instanceof Error ? err.message : "ffmpeg failed");
    throw new Error(`Audio extraction failed: ${msg}`);
  }
}
