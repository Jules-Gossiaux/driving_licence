export class InsufficientQuestionPoolError extends Error {
  readonly available: number;
  readonly required: number;

  constructor(available: number, required: number) {
    super(
      `Banque de questions insuffisante : ${available} question(s) disponible(s) pour ${required} requise(s).`,
    );
    this.name = "InsufficientQuestionPoolError";
    this.available = available;
    this.required = required;
  }
}

export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.min(index, Math.floor(random() * (index + 1)));
    const current = result[index];
    const swapped = result[swapIndex];

    if (current === undefined || swapped === undefined) {
      continue;
    }

    result[index] = swapped;
    result[swapIndex] = current;
  }

  return result;
}

export function selectExamQuestions<T>(
  pool: readonly T[],
  count: number,
  random: () => number,
): T[] {
  if (!Number.isInteger(count) || count <= 0) {
    throw new RangeError("Le nombre de questions doit être un entier strictement positif.");
  }

  if (pool.length < count) {
    throw new InsufficientQuestionPoolError(pool.length, count);
  }

  return shuffle(pool, random).slice(0, count);
}
