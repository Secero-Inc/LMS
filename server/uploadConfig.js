import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(rootDir, ".env") });

/** Default 20 GiB — raw footage; override with MAX_UPLOAD_BYTES in .env */
export const MAX_UPLOAD_BYTES =
  Number(process.env.MAX_UPLOAD_BYTES) || 20 * 1024 * 1024 * 1024;
