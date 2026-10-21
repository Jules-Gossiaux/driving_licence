"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { InvalidAnswerError } from "@/application/errors";
import { submitExamAnswer, startChapterExam, startExam } from "@/application/exam";
import { saveLessonRunStep, startLessonRun, submitLessonRetry } from "@/application/lesson-runs";
import {
  startChapterPractice,
  startLessonPractice,
  startReviewSession,
  startUnitChallenge,
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

export async function startLessonPracticeAction(formData: FormData): Promise<void> {
  const lessonId = formData.get("lessonId");
  if (typeof lessonId !== "string" || lessonId.length === 0) {
    throw new Error("Leçon manquante pour démarrer l'entraînement.");
  }

  const { attemptId } = startLessonPractice(getAppDependencies(), lessonId);
  redirect(`/entrainement/${attemptId}`);
}

export async function startUnitChallengeAction(formData: FormData): Promise<void> {
  const chapterId = formData.get("chapterId");
  const unitId = formData.get("unitId");

  if (typeof chapterId !== "string" || chapterId.length === 0) {
    throw new Error("Chapitre manquant pour démarrer le défi.");
  }
  if (typeof unitId !== "string" || unitId.length === 0) {
    throw new Error("Unité manquante pour démarrer le défi.");
  }

  const { attemptId } = startUnitChallenge(getAppDependencies(), chapterId, unitId);
  redirect(`/entrainement/${attemptId}`);
}

export async function startChapterExamAction(formData: FormData): Promise<void> {
  const chapterId = formData.get("chapterId");

  if (typeof chapterId !== "string" || chapterId.length === 0) {
    throw new Error("Chapitre manquant pour démarrer l'examen.");
  }

  const { attemptId } = startChapterExam(getAppDependencies(), chapterId);
  redirect(`/examen/${attemptId}`);
}

export async function startReviewAction(): Promise<void> {
  const { attemptId } = startReviewSession(getAppDependencies());
  redirect(`/entrainement/${attemptId}`);
}

export async function startLessonRunAction(formData: FormData): Promise<void> {
  const lessonId = formData.get("lessonId");
  if (typeof lessonId !== "string" || lessonId.length === 0) {
    throw new Error("Leçon manquante pour démarrer le parcours.");
  }

  const deps = getAppDependencies();
  const entry = deps.catalog.lessonById.get(lessonId);

  if (!entry) {
    throw new Error(`Leçon inconnue : ${lessonId}.`);
  }

  const { attemptId } = startLessonRun(deps, lessonId);

  redirect(
    `/chapitres/${entry.chapter.chapter.slug}/lecons/${entry.lesson.slug}/parcours/${attemptId}`,
  );
}

export async function saveLessonRunStepAction(input: {
  attemptId: string;
  stepIndex: number;
}): Promise<{ ok: boolean }> {
  try {
    saveLessonRunStep(getAppDependencies(), input);
    return { ok: true };
  } catch {
    return { ok: false };
  }
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

export async function submitLessonRetryAction(input: {
  attemptId: string;
  position: number;
  optionId: string;
}): Promise<TrainingAnswerActionResult> {
  try {
    return {
      ok: true,
      feedback: submitLessonRetry(getAppDependencies(), input),
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Impossible d'enregistrer la reprise.",
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

export async function continueLessonAction(formData: FormData): Promise<void> {
  const lessonId = formData.get("lessonId");
  const chapterSlug = formData.get("chapterSlug");
  const nextLessonSlug = formData.get("nextLessonSlug");

  if (typeof lessonId !== "string" || typeof chapterSlug !== "string") {
    throw new Error("Informations de leçon incomplètes.");
  }

  const deps = getAppDependencies();
  const chapterContent = deps.catalog.chapterBySlug.get(chapterSlug);
  const entry = deps.catalog.lessonById.get(lessonId);

  if (!chapterContent || !entry || entry.chapter.chapter.id !== chapterContent.chapter.id) {
    throw new Error(`Leçon inconnue : ${lessonId}.`);
  }

  deps.repository.setLessonRead(LOCAL_PROFILE_ID, lessonId, true, deps.clock.now().toISOString());

  revalidatePath(`/chapitres/${chapterContent.chapter.slug}/lecons/${entry.lesson.slug}`);
  revalidatePath(`/chapitres/${chapterContent.chapter.slug}`);
  revalidatePath("/");

  if (typeof nextLessonSlug === "string" && nextLessonSlug.length > 0) {
    const nextLesson = chapterContent.lessons.find((lesson) => lesson.slug === nextLessonSlug);

    if (!nextLesson) {
      throw new Error(`Leçon suivante inconnue : ${nextLessonSlug}.`);
    }

    redirect(`/chapitres/${chapterContent.chapter.slug}/lecons/${nextLesson.slug}`);
  }

  redirect(`/chapitres/${chapterContent.chapter.slug}`);
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
