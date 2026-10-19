import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { runMigrations } from "@/infrastructure/db/migrations";

const temporaryDirectories: string[] = [];

function createMigrationsDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "permis-b-migrations-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    const directory = temporaryDirectories.pop();
    if (directory) {
      rmSync(directory, { recursive: true, force: true });
    }
  }
});

describe("runMigrations", () => {
  it("applique chaque migration une seule fois", () => {
    const directory = createMigrationsDirectory();
    writeFileSync(
      join(directory, "0001_test.sql"),
      "CREATE TABLE sample (id INTEGER PRIMARY KEY);",
    );

    const db = new DatabaseSync(":memory:");
    try {
      expect(runMigrations(db, directory).applied).toEqual(["0001_test.sql"]);
      expect(runMigrations(db, directory).applied).toEqual([]);
    } finally {
      db.close();
    }
  });

  it("refuse une migration modifiée après application", () => {
    const directory = createMigrationsDirectory();
    const file = join(directory, "0001_test.sql");
    writeFileSync(file, "CREATE TABLE sample (id INTEGER PRIMARY KEY);");

    const db = new DatabaseSync(":memory:");
    try {
      runMigrations(db, directory);
      writeFileSync(file, "CREATE TABLE sample (id INTEGER PRIMARY KEY, label TEXT);");

      expect(() => runMigrations(db, directory)).toThrow(/modifiée après application/);
    } finally {
      db.close();
    }
  });

  it("annule la migration si son SQL échoue", () => {
    const directory = createMigrationsDirectory();
    writeFileSync(join(directory, "0001_broken.sql"), "CREATE TABLE incomplet (");

    const db = new DatabaseSync(":memory:");
    try {
      expect(() => runMigrations(db, directory)).toThrow();

      const rows = db.prepare("SELECT version FROM schema_migrations").all() as unknown as Array<{
        version: string;
      }>;
      expect(rows).toEqual([]);
    } finally {
      db.close();
    }
  });

  it("refuse un répertoire de migrations absent", () => {
    const db = new DatabaseSync(":memory:");
    try {
      expect(() => runMigrations(db, join(tmpdir(), "permis-b-absent-directory"))).toThrow(
        /Répertoire de migrations absent/,
      );
    } finally {
      db.close();
    }
  });
});
