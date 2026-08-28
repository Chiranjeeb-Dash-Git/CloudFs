import { Router } from "express";
import { mem } from "../store.js";
import { requireAuth } from "../auth.js";

export const activitiesRouter = Router();
activitiesRouter.use(requireAuth);

activitiesRouter.get("/", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const items = mem.activities
    .filter((a) => a.actorId === req.user.id)
    .slice(0, limit)
    .map((a) => {
      const resource =
        a.resourceType === "file"
          ? mem.files.find((f) => f.id === a.resourceId)
          : mem.folders.find((f) => f.id === a.resourceId);
      return {
        ...a,
        resourceName: resource?.name || (a.context?.name ?? null),
      };
    });
  res.json({ items });
});

