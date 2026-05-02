import path from "node:path";

/**
 * @param {string} originalName
 * @returns {string} Safe filename ending in .json (stem from basename, no path segments).
 */
export function transcriptJsonFilename(originalName) {
  const base = path.basename(originalName || "audio");
  const stem = base.replace(/\.[^/.]+$/, "") || "transcript";
  const safe = stem
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 200);
  return `${safe || "transcript"}.json`;
}
