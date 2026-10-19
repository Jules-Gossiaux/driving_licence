"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { InvalidAnswerError } from "@/application/errors";
import { submitExamAnswer, startExam } from "@/application/exam";
import {
  startChapterPractice,
  startReviewSession,
  submitTrainingAnswer,
  type TrainingAnswerActionResult,
} from "@/application/practice";
import { LOCAL_PROFILE_ID } from "@/domain/profile";
import { getAppDependencies } from "@/infrastructure/container";

export async function startPracticeAction(formData: FormData): Promise<void> {
  const chapterId = formData.get("chapterId");
  if (typeof chapterId !== "string" || chapterId.length === 0) {
    throw new Error("Chapitre manquant pour démarrer l'entraînement.");
  }

  const { attemptId } = startChapterPractice(getAppDependencies(), chapterId);
  redirect(`/entrainement/${attemptId}`);
}

export async function startReviewAction(): Promise<void> {
  const { attemptId } = startReviewSession(getAppDependencies());
  redirect(`/entrainement/${attemptId}`);
}

export async function startExamAction(formData: FormData): Promise<void> {
  const presetId = formData.get("presetId");
  if (typeof presetId !== "string" || presetId.length === 0) {
    throw new Error("Preset d'examen manquant.");
  }

  const { attemptId } = startExam(getAppDependencies(), presetId);
  redirect(`/examen/${attemptId}`);
}

export async function submitTrainingAnswerAction(input: {
  attemptId: string;
  position: number;
  optionId: string;
}): Promise<TrainingAnswerActionResult> {
  try {
    return {
      ok: true,
      feedback: submitTrainingAnswer(getAppDependencies(), input),
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Impossible d'enregistrer la réponse.",
    };
  }
}

export async function submitExamAnswerAction(input: {
  attemptId: string;
  position: number;
  optionId: string | null;
}): Promise<{ ok: false; message: string } | undefined> {
  let outcome;

  try {
    outcome = submitExamAnswer(getAppDependencies(), input);
  } catch (error) {
    if (error instanceof InvalidAnswerError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }

  if (outcome.kind === "completed") {
    redirect(`/resultats/${input.attemptId}`);
  }

  redirect(`/examen/${input.attemptId}`);
}

export async function markLessonReadAction(formData: FormData): Promise<void> {
  const lessonId = formData.get("lessonId");
  const chapterSlug = formData.get("chapterSlug");
  const lessonSlug = formData.get("lessonSlug");
  const read = formData.get("read") === "true";

  if (
    typeof lessonId !== "string" ||
    typeof chapterSlug !== "string" ||
    typeof lessonSlug !== "string"
  ) {
    throw new Error("Informations de leçon incomplètes.");
  }

  const deps = getAppDependencies();

  if (!deps.catalog.lessonById.has(lessonId)) {
    throw new Error(`Leçon inconnue : ${lessonId}.`);
  }

  deps.repository.setLessonRead(LOCAL_PROFILE_ID, lessonId, read, deps.clock.now().toISOString());

  revalidatePath(`/chapitres/${chapterSlug}/lecons/${lessonSlug}`);
  revalidatePath(`/chapitres/${chapterSlug}`);
  revalidatePath("/");
}
