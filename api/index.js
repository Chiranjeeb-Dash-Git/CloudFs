// Vercel Serverless Function entry point (CommonJS)
// This file acts as a bridge to load the ES Module backend in Vercel's Node runtime.

let cachedApp = null;
let storeReadyPromise = null;

const dynamicImport = new Function("specifier", "return import(specifier)");

module.exports = async (req, res) => {
  try {
    if (!cachedApp) {
      // Explicitly require backend dependencies to guarantee Vercel NFT bundles them
      try {
        require("express");
        require("cors");
        require("helmet");
        require("cookie-parser");
        require("express-rate-limit");
        require("pg");
        require("bcryptjs");
        require("jsonwebtoken");
        require("zod");
      } catch (e) {
        // Fallback if lazily loaded
      }

      // Dynamically import the ESM backend (via indirect import)
      const { createApp } = await dynamicImport("../backend/src/app.js");
      const { ensureStoreReady } = await dynamicImport("../backend/src/store.js");
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
};
