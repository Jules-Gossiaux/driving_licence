import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { DatabaseSync as SQLiteDatabase } from "node:sqlite";
import { LOCAL_PROFILE_ID, LOCAL_PROFILE_NAME } from "@/domain/profile";
import { runMigrations, type MigrationResult } from "./migrations";

export type OpenDatabaseResult = {
  db: DatabaseSync;
  path: string;
  migrations: MigrationResult;
};

function isInside(parent: string, candidate: string): boolean {
  const pathFromParent = relative(parent, candidate);
  return pathFromParent === "" || (!pathFromParent.startsWith("..") && !isAbsolute(pathFromParent));
}

export function resolveDatabasePath(
  configuredPath = process.env.DATABASE_PATH?.trim() || "./var/app.db",
): string {
  if (configuredPath === ":memory:") {
    return configuredPath;
  }

  const absolutePath = resolve(process.cwd(), configuredPath);
  const publicDirectory = resolve(process.cwd(), "public");
  const dataDirectory = resolve(process.cwd(), "data");

  if (isInside(publicDirectory, absolutePath) || isInside(dataDirectory, absolutePath)) {
    throw new Error(
      "La base SQLite doit rester hors de public/ et data/. " +
        "Utilise par exemple DATABASE_PATH=./var/app.db.",
    );
  }

  return absolutePath;
}

function ensureLocalProfile(db: DatabaseSync): void {
  db.prepare(
    "INSERT INTO profiles (id, display_name, created_at) VALUES (?, ?, ?) " +
      "ON CONFLICT(id) DO NOTHING",
  ).run(LOCAL_PROFILE_ID, LOCAL_PROFILE_NAME, new Date().toISOString());
}

export function openDatabase(configuredPath?: string): OpenDatabaseResult {
  const path = resolveDatabasePath(configuredPath);

  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }

  const db = new SQLiteDatabase(path);

  try {
    db.exec("PRAGMA foreign_keys = ON");
    db.exec("PRAGMA busy_timeout = 5000");

    if (path !== ":memory:") {
      db.exec("PRAGMA journal_mode = WAL");
      db.exec("PRAGMA synchronous = NORMAL");
    }

    const migrations = runMigrations(db);
    ensureLocalProfile(db);

    return { db, path, migrations };
  } catch (error) {
    db.close();
    throw error;
  }
}
