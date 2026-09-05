// Vercel Serverless Function entry point
import { createApp } from "../backend/src/app.js";
import { ensureStoreReady } from "../backend/src/store.js";

const app = createApp();

export default async function handler(req, res) {
  try {
    const ready = ensureStoreReady();
    if (ready && typeof ready.then === "function") {
      await ready;
    }
    return app(req, res);
  } catch (err) {
    console.error("Vercel API Bridge Error:", err);
    return res.status(500).json({
      error: {
        code: "BRIDGE_ERROR",
        message: "Failed to load backend module",
        details: err.message || String(err)
      }
    });
  }
}
