import { z } from "zod";
import {
  contentIdSchema,
  questionOptionSchema,
  questionSeveritySchema,
  sourceRefSchema,
  type Question,
} from "@/domain/content/schemas";

export const questionSnapshotSchema = z.strictObject({
  questionId: contentIdSchema,
  version: z.number().int().positive(),
  chapterId: contentIdSchema,
  lessonIds: z.array(contentIdSchema).min(1),
  prompt: z.string().min(1),
  options: z.array(questionOptionSchema).min(2),
  correctOptionId: contentIdSchema,
  explanation: z.string().min(1),
  mediaId: contentIdSchema.optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  severity: questionSeveritySchema,
  sourceRefs: z.array(sourceRefSchema).min(1),
});

export type QuestionSnapshot = z.infer<typeof questionSnapshotSchema>;

export type PublicQuestion = {
  id: string;
  prompt: string;
  options: Array<{ id: string; label: string }>;
  mediaId: string | null;
};

export function createQuestionSnapshot(question: Question): QuestionSnapshot {
  return {
    questionId: question.id,
    version: question.version,
    chapterId: question.chapterId,
    lessonIds: question.lessonIds,
    prompt: question.prompt,
    options: question.options,
    correctOptionId: question.correctOptionId,
    explanation: question.explanation,
    mediaId: question.mediaId,
    difficulty: question.difficulty,
    severity: question.severity,
    sourceRefs: question.sourceRefs,
  };
}

export function toPublicQuestion(snapshot: QuestionSnapshot): PublicQuestion {
  return {
    id: snapshot.questionId,
    prompt: snapshot.prompt,
    options: snapshot.options,
    mediaId: snapshot.mediaId ?? null,
  };
}
