import { notFound, redirect } from "next/navigation";
import { openExamSession } from "@/application/exam";
import { InvalidAnswerError } from "@/application/errors";
import { ExamRunner } from "@/components/exam-runner";
import { AttemptConflictError, AttemptNotFoundError } from "@/domain/learning/errors";
import { getAppDependencies } from "@/infrastructure/container";

type PageProps = {
  params: Promise<{ attemptId: string }>;
};

export const metadata = { title: "Examen en cours" };

export default async function ExamPage({ params }: PageProps) {
  const { attemptId } = await params;

  let opened;
  try {
    opened = openExamSession(getAppDependencies(), attemptId);
  } catch (error) {
    if (error instanceof AttemptNotFoundError) {
      notFound();
    }
    if (error instanceof AttemptConflictError || error instanceof InvalidAnswerError) {
      redirect("/examen");
    }
    throw error;
  }

  if (opened.kind === "completed") {
    redirect(`/resultats/${attemptId}`);
  }

  if (opened.kind === "abandoned") {
    redirect("/examen");
  }

  return (
    <ExamRunner
      key={`${opened.session.attemptId}:${opened.session.questionNumber}`}
      session={opened.session}
    />
  );
}
