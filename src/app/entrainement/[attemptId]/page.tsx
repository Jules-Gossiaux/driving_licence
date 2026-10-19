import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AttemptNotFoundError } from "@/domain/learning/errors";
import { getTrainingSession } from "@/application/practice";
import { PracticeRunner } from "@/components/practice-runner";
import { getAppDependencies } from "@/infrastructure/container";

type PageProps = {
  params: Promise<{ attemptId: string }>;
};

export const metadata = { title: "Entraînement" };

export default async function TrainingPage({ params }: PageProps) {
  const { attemptId } = await params;

  let session;
  try {
    session = getTrainingSession(getAppDependencies(), attemptId);
  } catch (error) {
    if (error instanceof AttemptNotFoundError) {
      notFound();
    }
    throw error;
  }

  if (session.alreadyCompleted) {
    redirect(`/resultats/${attemptId}`);
  }

  return (
    <div>
      <PracticeRunner
        attemptId={session.attemptId}
        title={session.title}
        mode={session.mode}
        questions={session.questions}
        initialPosition={session.initialPosition}
      />
      <div className="mx-auto mt-6 max-w-3xl">
        <Link
          href="/entrainement"
          className="text-sm text-slate-500 underline underline-offset-4 hover:text-slate-800"
        >
          Quitter la session
        </Link>
      </div>
    </div>
  );
}
