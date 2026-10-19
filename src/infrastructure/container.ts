import "server-only";
import { randomUUID } from "node:crypto";
import type { AppDependencies } from "@/application/content-views";
import { systemClock } from "@/domain/clock";
import { loadContentCatalog } from "./content/loader";
import { getDb } from "./db/client";
import { SqliteLearningRepository } from "./db/repository";

export function getAppDependencies(): AppDependencies {
  return {
    catalog: loadContentCatalog(),
    repository: new SqliteLearningRepository(getDb()),
    clock: systemClock,
    newId: randomUUID,
    random: Math.random,
  };
}
