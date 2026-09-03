// Vercel Serverless Function entry point (CommonJS)
// This file acts as a bridge to load the ES Module backend in Vercel's Node runtime.

let cachedApp = null;

module.exports = async (req, res) => {
  try {
    if (!cachedApp) {
      // Dynamically import the ESM backend
      const { createApp } = await import("../backend/src/app.js");
      cachedApp = createApp();
      
      // Give the database a moment to initialize on cold starts
      // This helps prevent "Session user missing" errors
      await new Promise(resolve => setTimeout(resolve, 500));
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
};
