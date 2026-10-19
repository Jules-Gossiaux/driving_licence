export class AttemptNotFoundError extends Error {
  constructor(attemptId: string) {
    super(`Tentative introuvable : ${attemptId}.`);
    this.name = "AttemptNotFoundError";
  }
}

export class AttemptConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttemptConflictError";
  }
}
