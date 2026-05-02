import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { DeepgramClient } from "@deepgram/sdk";
import { transcriptJsonFilename } from "./transcriptFilename.js";
import {
  extractAudioWithFfmpeg,
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
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

function getDeepgramClient() {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    throw new Error("Missing DEEPGRAM_API_KEY in .env");
  }
  return new DeepgramClient({ apiKey });
}

app.post("/api/transcribe", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file?.buffer) {
      return res.status(400).json({ error: "No file uploaded (field name: file)" });
    }

    await fs.mkdir(transcriptsDir, { recursive: true });

    let audioBuffer = file.buffer;
    if (shouldExtractAudioFromVideo(file.mimetype, file.originalname)) {
      audioBuffer = await extractAudioWithFfmpeg(file.buffer, file.originalname);
    }

    const deepgram = getDeepgramClient();
    const result = await deepgram.listen.v1.media.transcribeFile(audioBuffer, {
      model: "nova-3",
      smart_format: true,
    });

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
  }
});

app.listen(PORT, () => {
  console.log(`Transcribe API http://localhost:${PORT}`);
});
