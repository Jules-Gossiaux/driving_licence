import "server-only";
import type { DatabaseSync } from "node:sqlite";
import { openDatabase } from "./open";

type GlobalWithDatabase = typeof globalThis & {
  __permisBDatabase?: DatabaseSync;
};

export function getDb(): DatabaseSync {
  const globalWithDatabase = globalThis as GlobalWithDatabase;

  if (!globalWithDatabase.__permisBDatabase) {
    globalWithDatabase.__permisBDatabase = openDatabase().db;
  }

  return globalWithDatabase.__permisBDatabase;
}
