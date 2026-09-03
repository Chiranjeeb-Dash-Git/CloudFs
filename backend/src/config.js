import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const storageDir = path.resolve(process.env.STORAGE_DIR || path.join(__dirname, "../storage"));

// Only attempt to create the directory if we're not in a serverless environment (like Vercel)
// In Vercel, we should skip this entirely as the filesystem is read-only.
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  try {
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
  } catch (err) {
    console.warn("Warning: Could not create storage directory:", err.message);
  }
}
