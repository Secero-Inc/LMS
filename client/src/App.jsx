import { useCallback, useMemo, useRef, useState } from "react";

export default function App() {
  const fileInputRef = useRef(null);
  const [items, setItems] = useState([]);

  const processFiles = useCallback(async (fileList) => {
    const files = [...fileList];
    for (const file of files) {
      const id = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;
      setItems((prev) => [
        ...prev,
        { id, name: file.name, status: "uploading", error: null },
      ]);

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
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files?.length) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onFileInput = useCallback(
    (e) => {
      if (e.target.files?.length) {
        processFiles(e.target.files);
        e.target.value = "";
      }
    },
    [processFiles]
  );

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter((r) => r.status === "done").length;
    const failed = items.filter((r) => r.status === "error").length;
    const processing = items.filter((r) => r.status === "uploading").length;
    const finished = done + failed;
    const pct = total ? Math.round((finished / total) * 100) : 0;
    const active = items.find((r) => r.status === "uploading");
    return { total, done, failed, processing, finished, pct, active };
  }, [items]);

  return (
    <div style={layout}>
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
        <button
          type="button"
          style={launchButton}
          onClick={() => fileInputRef.current?.click()}
        >
          Launch My Shit
        </button>
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
              {stats.failed > 0 ? (
                <span style={{ color: "#b91c1c", marginLeft: "0.5rem" }}>
                  · {stats.failed} failed
                </span>
              ) : null}
            </span>
          </div>
          <div style={progressTrack}>
            <div style={{ ...progressFill, width: `${stats.pct}%` }} />
          </div>
          {stats.active ? (
            <p style={processingLine}>
              Processing: <strong>{stats.active.name}</strong>
            </p>
          ) : stats.finished === stats.total && stats.total > 0 ? (
            <p style={doneLine}>All files finished.</p>
          ) : null}

          <ul style={list}>
            {items.map((row) => (
              <li key={row.id} style={listItem}>
                <span style={{ fontWeight: 600 }}>{row.name}</span>
                <span style={rowStatus(row.status)}>
                  {row.status === "uploading" && "Processing…"}
                  {row.status === "done" && "Done"}
                  {row.status === "error" && row.error}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

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
    return { ...base, color: "#b91c1c" };
  }
  if (status === "done") {
    return { ...base, color: "#15803d" };
  }
  return { ...base, color: "#64748b" };
}

const layout = {
  maxWidth: "42rem",
  margin: "0 auto",
  padding: "2rem 1.25rem",
};

const header = { marginBottom: "1.25rem" };

const dropZone = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "12rem",
  border: "2px dashed #94a3b8",
  borderRadius: "12px",
  background: "#fff",
  padding: "1.5rem 1.25rem",
  gap: "0.75rem",
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
  background: "linear-gradient(180deg, #4f46e5, #4338ca)",
  boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
};

const dropHint = {
  fontSize: "0.85rem",
  color: "#64748b",
};

const statusSection = {
  marginTop: "1.5rem",
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
  color: "#0f172a",
};

const statusCounts = {
  fontSize: "0.9rem",
  color: "#64748b",
};

const progressTrack = {
  height: "8px",
  borderRadius: "999px",
  background: "#e2e8f0",
  overflow: "hidden",
};

const progressFill = {
  height: "100%",
  borderRadius: "999px",
  background: "linear-gradient(90deg, #3b82f6, #6366f1)",
  transition: "width 0.25s ease",
};

const processingLine = {
  margin: "0.75rem 0 0",
  fontSize: "0.9rem",
  color: "#475569",
};

const doneLine = {
  margin: "0.75rem 0 0",
  fontSize: "0.9rem",
  color: "#15803d",
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
  background: "#fff",
  borderRadius: "8px",
  padding: "0.65rem 0.85rem",
  border: "1px solid #e2e8f0",
};
