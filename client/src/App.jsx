import { useCallback, useState } from "react";

export default function App() {
  const [items, setItems] = useState([]);

  const processFiles = useCallback(async (fileList) => {
    const files = [...fileList];
    for (const file of files) {
      const id = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;
      setItems((prev) => [
        ...prev,
        { id, name: file.name, status: "uploading", error: null, savedAs: null },
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
            row.id === id
              ? {
                  ...row,
                  status: "done",
                  savedAs: data.savedAs,
                  preview: data.transcript?.slice(0, 280) ?? "",
                }
              : row
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

  return (
    <div style={layout}>
      <header style={header}>
        <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 650 }}>
          Drop audio to transcribe
        </h1>
        <p style={{ margin: "0.35rem 0 0", color: "#475569", fontSize: "0.95rem" }}>
          Files are sent to Deepgram; JSON is saved under{" "}
          <code style={code}>LMS/transcripts/</code>
        </p>
      </header>

      <label
        style={dropZone}
        onDrop={onDrop}
        onDragOver={onDragOver}
        htmlFor="file-input"
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept="audio/*,video/*,.mp3,.wav,.m4a,.webm,.ogg,.flac,.mp4,.mov"
          style={{ display: "none" }}
          onChange={onFileInput}
        />
        <span style={{ fontSize: "1rem" }}>
          Drag & drop files here, or click to choose
        </span>
        <span style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "0.5rem" }}>
          Prerecorded audio/video supported by Deepgram
        </span>
      </label>

      {items.length > 0 && (
        <ul style={list}>
          {items.map((row) => (
            <li key={row.id} style={listItem}>
              <div style={{ fontWeight: 600 }}>{row.name}</div>
              <div style={{ fontSize: "0.9rem", color: "#475569" }}>
                {row.status === "uploading" && "Transcribing…"}
                {row.status === "done" && (
                  <>
                    Saved: <code style={code}>{row.savedAs}</code>
                    {row.preview ? (
                      <div style={preview}>“{row.preview}…”</div>
                    ) : null}
                  </>
                )}
                {row.status === "error" && (
                  <span style={{ color: "#b91c1c" }}>{row.error}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
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
  minHeight: "11rem",
  border: "2px dashed #94a3b8",
  borderRadius: "12px",
  background: "#fff",
  cursor: "pointer",
  padding: "1.25rem",
};

const code = {
  fontSize: "0.88em",
  background: "#e2e8f0",
  padding: "0.1em 0.35em",
  borderRadius: "4px",
};

const list = {
  listStyle: "none",
  padding: 0,
  margin: "1.5rem 0 0",
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
};

const listItem = {
  background: "#fff",
  borderRadius: "8px",
  padding: "0.85rem 1rem",
  border: "1px solid #e2e8f0",
};

const preview = {
  marginTop: "0.5rem",
  color: "#334155",
  whiteSpace: "pre-wrap",
};
