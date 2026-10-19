import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { DatabaseSync } from "node:sqlite";

const DEFAULT_MIGRATIONS_DIRECTORY = resolve(process.cwd(), "migrations");

type MigrationRow = {
  version: string;
  checksum: string;
};

export type MigrationResult = {
  applied: string[];
};

function checksum(sql: string): string {
  return createHash("sha256").update(sql).digest("hex");
}

export function runMigrations(
  db: DatabaseSync,
  migrationsDirectory = DEFAULT_MIGRATIONS_DIRECTORY,
): MigrationResult {
  if (!existsSync(migrationsDirectory)) {
    throw new Error(`Répertoire de migrations absent : ${migrationsDirectory}`);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedRows = db
    .prepare("SELECT version, checksum FROM schema_migrations ORDER BY version")
    .all() as unknown as MigrationRow[];
  const appliedByVersion = new Map(appliedRows.map((row) => [row.version, row.checksum]));

  const files = readdirSync(migrationsDirectory)
    .filter((file) => file.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));

  const applied: string[] = [];

  for (const file of files) {
    const sql = readFileSync(resolve(migrationsDirectory, file), "utf8");
    const fileChecksum = checksum(sql);
    const previousChecksum = appliedByVersion.get(file);

    if (previousChecksum) {
      if (previousChecksum !== fileChecksum) {
        throw new Error(
          `La migration ${file} a été modifiée après application. ` +
            "Crée une nouvelle migration au lieu de modifier une migration déjà appliquée.",
        );
      }
      continue;
    }

    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(sql);
      db.prepare(
        "INSERT INTO schema_migrations (version, checksum, applied_at) VALUES (?, ?, ?)",
      ).run(file, fileChecksum, new Date().toISOString());
      db.exec("COMMIT");
      applied.push(file);
    } catch (error) {
      try {
        db.exec("ROLLBACK");
      } catch {
        // La transaction peut déjà être annulée par SQLite.
      }
      throw error;
    }
  }

  return { applied };
}
