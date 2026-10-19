import { describe, expect, it } from "vitest";
import {
  InsufficientQuestionPoolError,
  selectExamQuestions,
  shuffle,
} from "@/domain/exam/selection";

describe("shuffle", () => {
  it("produit un ordre déterministe avec une source aléatoire fixe", () => {
    expect(shuffle([1, 2, 3, 4], () => 0)).toEqual([2, 3, 4, 1]);
  });

  it("ne modifie pas le tableau d'origine", () => {
    const source = ["a", "b", "c"];
    const result = shuffle(source, () => 0.999);

    expect(result).toEqual(["a", "b", "c"]);
    expect(result).not.toBe(source);
  });

  it("conserve tous les éléments", () => {
    const result = shuffle([1, 2, 3, 4, 5], () => 0.42);
    expect([...result].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("selectExamQuestions", () => {
  it("sélectionne le nombre demandé sans doublon", () => {
    const result = selectExamQuestions([1, 2, 3, 4, 5], 3, () => 0.999);

    expect(result).toEqual([1, 2, 3]);
    expect(new Set(result).size).toBe(3);
  });

  it("signale une banque insuffisante", () => {
    expect(() => selectExamQuestions([1, 2], 3, () => 0.5)).toThrow(InsufficientQuestionPoolError);

    try {
      selectExamQuestions([1, 2], 3, () => 0.5);
    } catch (error) {
      expect(error).toBeInstanceOf(InsufficientQuestionPoolError);
      expect((error as InsufficientQuestionPoolError).available).toBe(2);
      expect((error as InsufficientQuestionPoolError).required).toBe(3);
    }
  });

  it("refuse un nombre de questions invalide", () => {
    expect(() => selectExamQuestions([1, 2], 0, () => 0.5)).toThrow(RangeError);
    expect(() => selectExamQuestions([1, 2], 1.5, () => 0.5)).toThrow(RangeError);
  });
});
