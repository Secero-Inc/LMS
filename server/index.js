import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import { DeepgramClient } from "@deepgram/sdk";
import { MAX_UPLOAD_BYTES } from "./uploadConfig.js";
import { transcriptJsonFilename } from "./transcriptFilename.js";
import {
  extractAudioWithFfmpegToPath,
  shouldExtractAudioFromVideo,
} from "./videoAudio.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");

dotenv.config({ path: path.join(rootDir, ".env") });

const PORT = Number(process.env.PORT) || 3001;
const transcriptsDir = path.join(rootDir, "transcripts");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "2mb" }));

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, os.tmpdir());
    },
    filename: (_req, file, cb) => {
      const safe = path
        .basename(file.originalname || "upload")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${randomUUID()}-${safe}`);
    },
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

function getDeepgramClient() {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    throw new Error("Missing DEEPGRAM_API_KEY in .env");
  }
  return new DeepgramClient({ apiKey });
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "lms-transcribe-api",
    hint: "Use the Vite dev URL in the browser for the UI; POST files to /api/transcribe",
  });
});

app.post("/api/transcribe", upload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file?.path) {
    return res.status(400).json({ error: "No file uploaded (field name: file)" });
  }

  try {
    await fs.mkdir(transcriptsDir, { recursive: true });

    const deepgram = getDeepgramClient();
    let result;
    if (shouldExtractAudioFromVideo(file.mimetype, file.originalname)) {
      console.time(`ffmpeg:${file.originalname}`);
      const extracted = await extractAudioWithFfmpegToPath(file.path);
      console.timeEnd(`ffmpeg:${file.originalname}`);

      try {
        console.time(`deepgram:${file.originalname}`);
        result = await deepgram.listen.v1.media.transcribeFile(
          createReadStream(extracted.audioPath),
          {
            model: "nova-3",
            smart_format: true,
          },
          { timeoutInSeconds: 300 }
        );
        console.timeEnd(`deepgram:${file.originalname}`);
      } finally {
        await extracted.cleanup();
      }
    } else {
      console.time(`deepgram:${file.originalname}`);
      result = await deepgram.listen.v1.media.transcribeFile(
        createReadStream(file.path),
        {
          model: "nova-3",
          smart_format: true,
        },
        { timeoutInSeconds: 300 }
      );
      console.timeEnd(`deepgram:${file.originalname}`);
    }

    const outName = transcriptJsonFilename(file.originalname);
    const outPath = path.join(transcriptsDir, outName);

    await fs.writeFile(outPath, JSON.stringify(result, null, 2), "utf8");

    const relativePath = path.join("transcripts", outName);
    const transcript =
      result?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";

    res.json({
      ok: true,
      savedAs: relativePath,
      transcript,
    });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Transcription failed";
    res.status(500).json({ error: message });
  } finally {
    await fs.unlink(file.path).catch(() => {});
  }
});

app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    path: req.path,
    hint:
      "This host is the API only. Open the Vite dev server URL (e.g. http://localhost:5173/) for the drop UI. Try GET /api/health.",
  });
});

app.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: "File too large",
        maxBytes: MAX_UPLOAD_BYTES,
        hint: "Set MAX_UPLOAD_BYTES in .env to raise the cap (value in bytes).",
      });
    }
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
});

const server = app.listen(PORT, () => {
  console.log(`Transcribe API http://localhost:${PORT}`);
});

server.on("error", (err) => {
  if (/** @type {NodeJS.ErrnoException} */ (err).code === "EADDRINUSE") {
    console.error(
      `\nPort ${PORT} is already in use.\n` +
        `Free it:    lsof -ti:${PORT} | xargs kill\n` +
        `Or use:     PORT=3002 npm run dev   (add PORT=3002 to .env to persist)\n`
    );
    process.exit(1);
  }
  throw err;
});
