import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const storageDir = path.resolve(process.env.STORAGE_DIR || path.join(__dirname, "../storage"));
fs.mkdirSync(storageDir, { recursive: true });
