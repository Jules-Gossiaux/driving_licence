import { notFound } from "next/navigation";
import { getLessonRunView } from "@/application/lesson-runs";
import { LessonRunner } from "@/components/lesson-runner";
import { AttemptConflictError, AttemptNotFoundError } from "@/domain/learning/errors";
import { getAppDependencies } from "@/infrastructure/container";

type PageProps = {
  params: Promise<{ slug: string; lessonSlug: string; attemptId: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { attemptId } = await params;

  try {
    const view = getLessonRunView(getAppDependencies(), attemptId);
    return { title: view.lessonTitle };
  } catch {
    return { title: "Parcours introuvable" };
  }
}

export default async function LessonRunPage({ params }: PageProps) {
  const { slug, lessonSlug, attemptId } = await params;
  let view;

  try {
    view = getLessonRunView(getAppDependencies(), attemptId);
  } catch (error) {
    if (error instanceof AttemptNotFoundError || error instanceof AttemptConflictError) {
      notFound();
    }
    throw error;
  }

  if (view.chapterSlug !== slug || view.lessonSlug !== lessonSlug) {
    notFound();
  }

  return <LessonRunner {...view} />;
}
