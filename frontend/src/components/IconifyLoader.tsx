"use client";

import { useEffect } from "react";

/**
 * Loads the iconify-icon custom element from the npm package
 * instead of fetching it from a CDN. This eliminates an external
 * network round-trip and lets Next.js code-split it properly.
 */
export function IconifyLoader() {
  useEffect(() => {
    import("iconify-icon");
  }, []);
  return null;
}
