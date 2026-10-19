import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveDatabasePath } from "@/infrastructure/db/open";

describe("resolveDatabasePath", () => {
  it("accepte une base en mémoire", () => {
    expect(resolveDatabasePath(":memory:")).toBe(":memory:");
  });

  it("résout un chemin relatif depuis la racine du projet", () => {
    expect(resolveDatabasePath("./var/test.db")).toBe(resolve(process.cwd(), "var/test.db"));
  });

  it("refuse toute base située dans public/", () => {
    expect(() => resolveDatabasePath("./public/app.db")).toThrow(/hors de public\/ et data\//);
    expect(() => resolveDatabasePath("./public/sous-dossier/app.db")).toThrow(
      /hors de public\/ et data\//,
    );
  });

  it("refuse toute base située dans data/", () => {
    expect(() => resolveDatabasePath("./data/app.db")).toThrow(/hors de public\/ et data\//);
  });

  it("refuse un chemin absolu dans public/", () => {
    const path = resolve(process.cwd(), "public", "nested", "app.db");
    expect(() => resolveDatabasePath(path)).toThrow(/hors de public\/ et data\//);
  });
});
