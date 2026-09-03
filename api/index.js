// Vercel Serverless Function entry point (CommonJS)
// This file acts as a bridge to load the ES Module backend in Vercel's Node runtime.

module.exports = async (req, res) => {
  try {
    // Dynamically import the ESM backend
    const { createApp } = await import("../backend/src/app.js");
    const app = createApp();
    
    // Express apps are functions that can handle (req, res)
    return app(req, res);
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
