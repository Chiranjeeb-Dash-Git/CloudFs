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
import { meRouter } from "./routes/me.js";
import { sessionsRouter } from "./routes/sessions.js";
import { activitiesRouter } from "./routes/activities.js";
import { settingsRouter } from "./routes/settings.js";
import { notificationsRouter } from "./routes/notifications.js";
import { usersRouter } from "./routes/users.js";
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

  app.get("/health", (_req, res) =>
    res.json({ ok: true, service: "cloudfs-api", version: "1.1.0" }),
  );

  // Auth (register/login/logout/refresh/me/google/change-password)
  app.use("/api/auth", authRouter);

  // Resource routers
  app.use("/api/folders", foldersRouter);
  app.use("/api/files", filesRouter);

  // User-facing feature routers
  app.use("/api/me", meRouter);
  app.use("/api/sessions", sessionsRouter);
  app.use("/api/activities", activitiesRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/users", usersRouter);

  // Mounted at /api: shares (user + link), search, stars, trash
  app.use("/api", sharesRouter);
  app.use("/api", searchRouter);

  app.use((err, _req, res, _next) => sendError(res, err));
  return app;
}
