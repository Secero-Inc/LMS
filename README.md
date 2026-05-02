# LMS

Learning management system for Secero.

## Transcribe app (local)

Web UI to drop audio or video files: the API transcribes them with [Deepgram](https://deepgram.com/) and saves JSON under `transcripts/`. Video files are run through **ffmpeg** (audio extract) before transcription.

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **ffmpeg** on your `PATH` (e.g. macOS: `brew install ffmpeg`) — required for video uploads
- A **Deepgram** API key

### Configuration

Create or edit `.env` in the project root:

```bash
DEEPGRAM_API_KEY=your_key_here
```

Optional: set `PORT` in `.env` or the shell for the API (default **3001**). The Vite dev proxy uses the same value so the UI keeps working.

### Install and run

From this directory:

```bash
npm install
npm run dev
```

That starts:

1. **API** — `http://localhost:3001` (or the `PORT` you set)
2. **Vite dev server** — usually `http://localhost:5173` (if 5173 is taken, Vite picks the next free port, e.g. **5174**)

Open the **Vite** URL in your browser (check the terminal for the exact port). The UI calls `/api/*`, which Vite proxies to the API.

### Other commands

| Command        | Purpose                          |
| -------------- | -------------------------------- |
| `npm run dev`  | API + Vite (development)         |
| `npm run build` | Production build of the client |
| `npm run preview` | Preview production build     |
| `npm test`     | Run unit tests                   |

### If `npm run dev` fails (ports in use)

- **`EADDRINUSE` on 3001** — another process (often a previous run of this app) is using that port. Stop it, or set a different port, e.g. `PORT=3002 npm run dev`, and [point Vite at that port](vite.config.js) under `server.proxy` for `/api`, or free the old process.
- **Vite “Port 5173 is in use”** — Vite will try 5174, 5175, etc.; use the URL printed in the terminal.

Transcript files are written to `transcripts/<filename-stem>.json` at the repo root.
