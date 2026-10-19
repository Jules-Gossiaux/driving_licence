export const ANSWER_GRACE_MS = 2_000;

export function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1_000);
}

export function addMilliseconds(date: Date, milliseconds: number): Date {
  return new Date(date.getTime() + milliseconds);
}

export function isDeadlineExpired(deadline: Date, now: Date, graceMs = 0): boolean {
  return now.getTime() > deadline.getTime() + graceMs;
}

export function clampElapsedMs(start: Date, end: Date, maximumMs: number): number {
  const elapsed = end.getTime() - start.getTime();
  return Math.min(Math.max(elapsed, 0), maximumMs);
}

export function remainingSeconds(deadline: Date, now: Date): number {
  return Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / 1_000));
}

export function durationMs(start: Date, end: Date): number {
  return Math.max(0, end.getTime() - start.getTime());
}
