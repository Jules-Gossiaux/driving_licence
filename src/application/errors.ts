export class ContentNotFoundError extends Error {
  constructor(resource: string) {
    super(`Contenu introuvable : ${resource}.`);
    this.name = "ContentNotFoundError";
  }
}

export class InvalidAnswerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAnswerError";
  }
}

export class PracticeUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PracticeUnavailableError";
  }
}
