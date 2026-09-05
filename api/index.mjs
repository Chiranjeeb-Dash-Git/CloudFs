// Vercel Serverless Function entry point (ESM)
// Using .mjs extension forces Node.js and Vercel to treat this as ES Module,
// preventing esbuild from downleveling dynamic imports to require().

let cachedApp = null;
let storeReadyPromise = null;

export default async function handler(req, res) {
  try {
    if (!cachedApp) {
      const { createApp } = await import("../backend/src/app.js");
      const { ensureStoreReady } = await import("../backend/src/store.js");
      cachedApp = createApp();
      storeReadyPromise = ensureStoreReady();
    }
    
    // Await database synchronization so memory store is fully loaded before handling request
    if (storeReadyPromise) {
      await storeReadyPromise;
    }
    
    // Express apps are functions that can handle (req, res)
    return cachedApp(req, res);
  } catch (err) {
    console.error("Vercel API Bridge Error:", err);
    res.status(500).json({
      error: {
        code: "BRIDGE_ERROR",
        message: "Failed to load backend module",
        details: err.message
      }
    });
  }
}
