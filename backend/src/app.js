import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { authRouter } from "./routes/auth.js";
import { foldersRouter } from "./routes/folders.js";
import { filesRouter } from "./routes/files.js";
import { sharesRouter } from "./routes/shares.js";
import { searchRouter } from "./routes/search.js";
import { sendError } from "./util.js";

export function createApp() {
  const app = express();
  const origin = process.env.CORS_ORIGIN || "http://localhost:3000";

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use((req, res, next) => {
    if (req.method === "PUT" && req.path.endsWith("/bytes")) {
      return express.raw({ type: "*/*", limit: "512mb" })(req, res, next);
    }
    next();
  });
  app.use(express.json({ limit: "2mb" }));
  app.use(
    rateLimit({
      windowMs: 5 * 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.get("/health", (_req, res) => res.json({ ok: true, service: "cloudfs-api" }));
  app.use("/api/auth", authRouter);
  app.use("/api/folders", foldersRouter);
  app.use("/api/files", filesRouter);
  app.use("/api", sharesRouter);
  app.use("/api", searchRouter);

  app.use((err, _req, res, _next) => sendError(res, err));
  return app;
}
