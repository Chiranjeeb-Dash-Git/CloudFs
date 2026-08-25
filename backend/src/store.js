import { randomUUID } from "node:crypto";

const now = () => new Date().toISOString();

export function createMemoryStore() {
  const users = [];
  const folders = [];
  const files = [];
  const versions = [];
  const shares = [];
  const links = [];
  const stars = [];
  const activities = [];
  const refresh = new Map();

  return {
    users,
    folders,
    files,
    versions,
    shares,
    links,
    stars,
    activities,
    refresh,
    id: () => randomUUID(),
    now,
  };
}

export const mem = createMemoryStore();
