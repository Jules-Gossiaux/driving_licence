import { describe, expect, it } from "vitest";
import {
  CHAPTER_EXAM,
  isChapterExamUnlocked,
  isUnitChallengeUnlocked,
} from "@/domain/learning/progression";

describe("progression des évaluations", () => {
  it("débloque le défi d'unité quand toutes ses leçons sont terminées", () => {
    expect(isUnitChallengeUnlocked(7, 6)).toBe(false);
    expect(isUnitChallengeUnlocked(7, 7)).toBe(true);
    expect(isUnitChallengeUnlocked(0, 0)).toBe(false);
  });

  it("exige les leçons et une banque complète pour l'examen de chapitre", () => {
    expect(
      isChapterExamUnlocked({
        lessonCount: 7,
        readLessonCount: 6,
        availableQuestions: 56,
      }),
    ).toBe(false);

    expect(
      isChapterExamUnlocked({
        lessonCount: 7,
        readLessonCount: 7,
        availableQuestions: CHAPTER_EXAM.questionCount - 1,
      }),
    ).toBe(false);

    expect(
      isChapterExamUnlocked({
        lessonCount: 7,
        readLessonCount: 7,
        availableQuestions: CHAPTER_EXAM.questionCount,
      }),
    ).toBe(true);
  });

  it("garde un examen de chapitre court, distinct du format officiel", () => {
    expect(CHAPTER_EXAM).toMatchObject({
      questionCount: 20,
      secondsPerQuestion: 15,
      passingScore: 17,
    });
  });
});
