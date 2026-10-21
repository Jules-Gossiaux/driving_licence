export const UNIT_CHALLENGE_QUESTION_COUNT = 10;

export const CHAPTER_EXAM = {
  questionCount: 50,
  secondsPerQuestion: 15,
  passingScore: 41,
  errorPenalty: 1,
  severeErrorPenalty: 5,
} as const;

export function isUnitChallengeUnlocked(lessonCount: number, readLessonCount: number): boolean {
  return lessonCount > 0 && readLessonCount >= lessonCount;
}

export function isChapterExamUnlocked(input: {
  lessonCount: number;
  readLessonCount: number;
  availableQuestions: number;
}): boolean {
  return (
    isUnitChallengeUnlocked(input.lessonCount, input.readLessonCount) &&
    input.availableQuestions >= CHAPTER_EXAM.questionCount
  );
}
