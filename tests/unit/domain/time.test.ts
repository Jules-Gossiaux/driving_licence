import { describe, expect, it } from "vitest";
import {
  addMilliseconds,
  addSeconds,
  clampElapsedMs,
  durationMs,
  isDeadlineExpired,
  remainingSeconds,
} from "@/domain/exam/time";

const start = new Date("2026-10-19T10:00:00.000Z");

describe("exam time helpers", () => {
  it("ajoute des secondes et des millisecondes", () => {
    expect(addSeconds(start, 15).toISOString()).toBe("2026-10-19T10:00:15.000Z");
    expect(addMilliseconds(start, 1_500).toISOString()).toBe("2026-10-19T10:00:01.500Z");
  });

  it("gère la grâce accordée après l'échéance", () => {
    const deadline = addSeconds(start, 15);

    expect(isDeadlineExpired(deadline, deadline)).toBe(false);
    expect(isDeadlineExpired(deadline, addMilliseconds(deadline, 1))).toBe(true);
    expect(isDeadlineExpired(deadline, addMilliseconds(deadline, 1_500), 2_000)).toBe(false);
    expect(isDeadlineExpired(deadline, addMilliseconds(deadline, 2_001), 2_000)).toBe(true);
  });

  it("borne le temps passé entre zéro et le maximum", () => {
    expect(clampElapsedMs(start, new Date(start.getTime() - 1_000), 15_000)).toBe(0);
    expect(clampElapsedMs(start, addSeconds(start, 3), 15_000)).toBe(3_000);
    expect(clampElapsedMs(start, addSeconds(start, 20), 15_000)).toBe(15_000);
  });

  it("arrondit le temps restant à la seconde supérieure", () => {
    const deadline = addSeconds(start, 15);

    expect(remainingSeconds(deadline, start)).toBe(15);
    expect(remainingSeconds(deadline, addMilliseconds(start, 500))).toBe(15);
    expect(remainingSeconds(deadline, addMilliseconds(start, 14_500))).toBe(1);
    expect(remainingSeconds(deadline, addSeconds(start, 20))).toBe(0);
  });

  it("calcule une durée jamais négative", () => {
    expect(durationMs(start, addSeconds(start, 42))).toBe(42_000);
    expect(durationMs(start, new Date(start.getTime() - 500))).toBe(0);
  });
});
