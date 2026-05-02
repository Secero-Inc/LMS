import { useCallback, useMemo, useRef, useState } from "react";

const MAX_PARALLEL_FILES = 3;

export default function App() {
  const fileInputRef = useRef(null);
  const [items, setItems] = useState([]);

  const queueFiles = useCallback((fileList) => {
    const files = [...fileList];
    setItems((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        name: file.name,
        status: "queued",
        error: null,
      })),
    ]);
  }, []);

  const launchQueuedFiles = useCallback(async () => {
    const queuedItems = items.filter((row) => row.status === "queued");
    let nextIndex = 0;

    async function processItem(item) {
      const { id, file } = item;
      setItems((prev) =>
        prev.map((row) =>
          row.id === id ? { ...row, status: "uploading", error: null } : row
        )
      );

      const form = new FormData();
      form.append("file", file);

      try {
        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: form,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || res.statusText || "Request failed");
        }
        setItems((prev) =>
          prev.map((row) =>
            row.id === id ? { ...row, status: "done" } : row
          )
        );
      } catch (e) {
        const message = e instanceof Error ? e.message : "Error";
        setItems((prev) =>
          prev.map((row) =>
            row.id === id ? { ...row, status: "error", error: message } : row
          )
        );
      }
    }

    const workerCount = Math.min(MAX_PARALLEL_FILES, queuedItems.length);
    await Promise.all(
      Array.from({ length: workerCount }, async () => {
        while (nextIndex < queuedItems.length) {
          const item = queuedItems[nextIndex];
          nextIndex += 1;
          await processItem(item);
        }
      })
    );
  }, [items]);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files?.length) {
        queueFiles(e.dataTransfer.files);
      }
    },
    [queueFiles]
  );

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onFileInput = useCallback(
    (e) => {
      if (e.target.files?.length) {
        queueFiles(e.target.files);
        e.target.value = "";
      }
    },
    [queueFiles]
  );

  const stats = useMemo(() => {
    const total = items.length;
    const queued = items.filter((r) => r.status === "queued").length;
    const done = items.filter((r) => r.status === "done").length;
    const failed = items.filter((r) => r.status === "error").length;
    const processing = items.filter((r) => r.status === "uploading").length;
    const finished = done + failed;
    const pct = total ? Math.round((finished / total) * 100) : 0;
    const active = items.find((r) => r.status === "uploading");
    return { total, queued, done, failed, processing, finished, pct, active };
  }, [items]);

  const canLaunch = stats.queued > 0 && stats.processing === 0;

  return (
    <div style={pageShell}>
      <ParticleBackground />
      <main style={layout}>
        <header style={header}>
          <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 650 }}>
            Drop raw footage
          </h1>
        </header>

        <div style={dropZone} onDrop={onDrop} onDragOver={onDragOver}>
          <input
            ref={fileInputRef}
            id="file-input"
            type="file"
            multiple
            accept="audio/*,video/*,.mp3,.wav,.m4a,.webm,.ogg,.flac,.mp4,.mov"
            style={{ display: "none" }}
            onChange={onFileInput}
          />
          <div style={buttonRow}>
            <button
              type="button"
              style={chooseButton}
              onClick={() => fileInputRef.current?.click()}
            >
              Choose Files
            </button>
            <button
              type="button"
              style={canLaunch ? launchButton : { ...launchButton, ...disabledButton }}
              onClick={launchQueuedFiles}
              disabled={!canLaunch}
            >
              Launch My Shit
            </button>
          </div>
          <span style={dropHint}>or drag files onto this area</span>
        </div>

        {items.length > 0 && (
          <section style={statusSection} aria-live="polite">
            <div style={statusHeader}>
              <span style={statusTitle}>
                {stats.total} file{stats.total !== 1 ? "s" : ""} in queue
              </span>
              <span style={statusCounts}>
                {stats.finished}/{stats.total} complete
                {stats.queued > 0 ? (
                  <span style={{ marginLeft: "0.5rem" }}>
                    · {stats.queued} queued
                  </span>
                ) : null}
                {stats.failed > 0 ? (
                  <span style={{ color: "#fecaca", marginLeft: "0.5rem" }}>
                    · {stats.failed} failed
                  </span>
                ) : null}
              </span>
            </div>
            <div style={progressTrack}>
              <div style={{ ...progressFill, width: `${stats.pct}%` }} />
            </div>
          {stats.processing > 0 && stats.active ? (
              <p style={processingLine}>
              Processing {stats.processing} file{stats.processing !== 1 ? "s" : ""}:{" "}
              <strong>{stats.active.name}</strong>
              </p>
            ) : stats.finished === stats.total && stats.total > 0 ? (
              <p style={doneLine}>All files finished.</p>
            ) : stats.queued > 0 ? (
              <p style={processingLine}>Ready to launch.</p>
            ) : null}

            <ul style={list}>
              {items.map((row) => (
                <li key={row.id} style={listItem}>
                  <span style={{ fontWeight: 600 }}>{row.name}</span>
                  <span style={rowStatus(row.status)}>
                    {row.status === "queued" && "Queued"}
                    {row.status === "uploading" && "Processing…"}
                    {row.status === "done" && "Done"}
                    {row.status === "error" && row.error}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}

function ParticleBackground() {
  return (
    <div className="particle-bg" aria-hidden="true">
      <div className="particle-grid" />
      <div className="energy-orb energy-orb-one" />
      <div className="energy-orb energy-orb-two" />
      <div className="energy-orb energy-orb-three" />
      {particles.map((particle) => (
        <span
          className="particle"
          key={particle.id}
          style={{
            "--x": `${particle.x}%`,
            "--delay": `${particle.delay}s`,
            "--duration": `${particle.duration}s`,
            "--size": `${particle.size}px`,
            "--drift": `${particle.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

const particles = [
  { id: 1, x: 6, delay: -2, duration: 18, size: 3, drift: 80 },
  { id: 2, x: 12, delay: -8, duration: 24, size: 6, drift: -120 },
  { id: 3, x: 18, delay: -4, duration: 20, size: 4, drift: 140 },
  { id: 4, x: 24, delay: -15, duration: 28, size: 7, drift: -80 },
  { id: 5, x: 31, delay: -6, duration: 22, size: 5, drift: 120 },
  { id: 6, x: 37, delay: -12, duration: 26, size: 3, drift: -150 },
  { id: 7, x: 44, delay: -1, duration: 19, size: 8, drift: 90 },
  { id: 8, x: 50, delay: -10, duration: 25, size: 4, drift: -110 },
  { id: 9, x: 57, delay: -5, duration: 21, size: 6, drift: 160 },
  { id: 10, x: 63, delay: -14, duration: 30, size: 3, drift: -90 },
  { id: 11, x: 70, delay: -7, duration: 23, size: 7, drift: 130 },
  { id: 12, x: 76, delay: -18, duration: 32, size: 4, drift: -140 },
  { id: 13, x: 83, delay: -3, duration: 20, size: 5, drift: 100 },
  { id: 14, x: 89, delay: -11, duration: 27, size: 8, drift: -120 },
  { id: 15, x: 95, delay: -16, duration: 29, size: 4, drift: 70 },
  { id: 16, x: 40, delay: -20, duration: 34, size: 10, drift: 180 },
];

function rowStatus(status) {
  const base = {
    fontSize: "0.9rem",
    marginLeft: "auto",
    paddingLeft: "0.75rem",
    textAlign: "right",
    flexShrink: 0,
    maxWidth: "55%",
  };
  if (status === "error") {
    return { ...base, color: "#fecaca" };
  }
  if (status === "done") {
    return { ...base, color: "#bbf7d0" };
  }
  return { ...base, color: "#cbd5e1" };
}

const pageShell = {
  position: "relative",
  minHeight: "100vh",
  overflow: "hidden",
};

const layout = {
  position: "relative",
  zIndex: 1,
  maxWidth: "42rem",
  margin: "0 auto",
  padding: "2rem 1.25rem",
};

const header = { marginBottom: "1.25rem", color: "#f8fafc" };

const dropZone = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "12rem",
  border: "2px dashed rgba(165, 180, 252, 0.58)",
  borderRadius: "18px",
  background: "rgba(15, 23, 42, 0.72)",
  backdropFilter: "blur(18px)",
  padding: "1.5rem 1.25rem",
  gap: "0.75rem",
  boxShadow: "0 24px 80px rgba(15, 23, 42, 0.35)",
};

const buttonRow = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: "0.75rem",
};

const chooseButton = {
  font: "inherit",
  fontSize: "1rem",
  fontWeight: 650,
  padding: "0.65rem 1.25rem",
  borderRadius: "8px",
  border: "1px solid rgba(226, 232, 240, 0.4)",
  cursor: "pointer",
  color: "#f8fafc",
  background: "rgba(255, 255, 255, 0.1)",
};

const launchButton = {
  font: "inherit",
  fontSize: "1rem",
  fontWeight: 650,
  padding: "0.65rem 1.25rem",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
  color: "#fff",
  background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
  boxShadow: "0 0 28px rgba(34, 211, 238, 0.3)",
};

const disabledButton = {
  cursor: "not-allowed",
  opacity: 0.55,
};

const dropHint = {
  fontSize: "0.85rem",
  color: "#cbd5e1",
};

const statusSection = {
  marginTop: "1.5rem",
  color: "#f8fafc",
};

const statusHeader = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "0.5rem",
  marginBottom: "0.65rem",
};

const statusTitle = {
  fontWeight: 650,
  fontSize: "1rem",
  color: "#f8fafc",
};

const statusCounts = {
  fontSize: "0.9rem",
  color: "#cbd5e1",
};

const progressTrack = {
  height: "8px",
  borderRadius: "999px",
  background: "rgba(226, 232, 240, 0.16)",
  overflow: "hidden",
};

const progressFill = {
  height: "100%",
  borderRadius: "999px",
  background: "linear-gradient(90deg, #22d3ee, #a78bfa)",
  transition: "width 0.25s ease",
};

const processingLine = {
  margin: "0.75rem 0 0",
  fontSize: "0.9rem",
  color: "#cbd5e1",
};

const doneLine = {
  margin: "0.75rem 0 0",
  fontSize: "0.9rem",
  color: "#bbf7d0",
};

const list = {
  listStyle: "none",
  padding: 0,
  margin: "1rem 0 0",
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
};

const listItem = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "0.75rem",
  background: "rgba(15, 23, 42, 0.68)",
  borderRadius: "8px",
  padding: "0.65rem 0.85rem",
  border: "1px solid rgba(226, 232, 240, 0.14)",
  backdropFilter: "blur(14px)",
};
