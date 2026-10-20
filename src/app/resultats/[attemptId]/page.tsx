import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAttemptResult } from "@/application/queries";
import { OptionContent } from "@/components/option-content";
import { PageHeader } from "@/components/ui";
import { AttemptNotFoundError } from "@/domain/learning/errors";
import { getAppDependencies } from "@/infrastructure/container";
import { formatDateTime, formatDuration, formatScore, modeLabel } from "@/lib/format";

type PageProps = {
  params: Promise<{ attemptId: string }>;
};

export const metadata = { title: "Résultat" };

export default async function ResultPage({ params }: PageProps) {
  const { attemptId } = await params;

  let lookup;
  try {
    lookup = getAttemptResult(getAppDependencies(), attemptId);
  } catch (error) {
    if (error instanceof AttemptNotFoundError) {
      notFound();
    }
    throw error;
  }

  if (lookup.kind === "in_progress") {
    redirect(
      lookup.mode === "exam" ? `/examen/${lookup.attemptId}` : `/entrainement/${lookup.attemptId}`,
    );
  }

  if (lookup.kind === "abandoned") {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-950">Tentative abandonnée</h1>
        <p className="mt-2 text-sm text-slate-600">
          Cette tentative a été interrompue et ne contient pas de résultat.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  const result = lookup.result;
  const isExam = result.mode === "exam";
  const success = isExam ? result.passed === true : true;
  const eyebrow =
    result.kind === "lesson"
      ? "Leçon"
      : result.kind === "unit"
        ? "Défi"
        : result.kind === "chapter-exam"
          ? "Examen de chapitre"
          : modeLabel(result.mode);
  const severeFaultCount = result.questions.filter(
    (question) => !question.isCorrect && !question.timedOut && question.severity === "severe",
  ).length;

  return (
    <div>
      <PageHeader
        eyebrow={eyebrow}
        title={
          isExam
            ? success
              ? "Examen réussi"
              : "Examen échoué"
            : result.kind === "unit"
              ? "Défi terminé"
              : "Session terminée"
        }
        description={`${result.title} · terminé le ${formatDateTime(result.completedAt)}`}
      />

      <section
        className={`rounded-2xl border p-6 shadow-sm sm:p-8 ${
          isExam
            ? success
              ? "border-emerald-200 bg-emerald-50"
              : "border-rose-200 bg-rose-50"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-wide uppercase opacity-70">
              {isExam ? "Score" : "Bonnes réponses"}
            </p>
            <p className="mt-1 text-5xl font-semibold tracking-tight text-slate-950 tabular-nums">
              {formatScore(result.score, result.questionCount)}
            </p>
            {isExam && result.passingScore !== null ? (
              <p className="mt-2 text-sm text-slate-700">
                Seuil de réussite : {result.passingScore}/{result.questionCount}
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-700">
                {result.correctCount} réponse{result.correctCount > 1 ? "s" : ""} correcte
                {result.correctCount > 1 ? "s" : ""} sur {result.questionCount}.
              </p>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-slate-500">Correctes</dt>
              <dd className="font-semibold text-slate-950 tabular-nums">{result.correctCount}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Incorrectes</dt>
              <dd className="font-semibold text-slate-950 tabular-nums">{result.incorrectCount}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Temps écoulé</dt>
              <dd className="font-semibold text-slate-950 tabular-nums">{result.timedOutCount}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Durée</dt>
              <dd className="font-semibold text-slate-950 tabular-nums">
                {formatDuration(result.durationMs)}
              </dd>
            </div>
          </dl>
        </div>
        {isExam ? (
          <p className="mt-5 text-sm text-slate-700">
            {result.penaltyPoints} point{result.penaltyPoints > 1 ? "s" : ""} de pénalité au total
            {severeFaultCount > 0
              ? `, dont ${severeFaultCount} faute${severeFaultCount > 1 ? "s" : ""} grave${severeFaultCount > 1 ? "s" : ""}.`
              : "."}{" "}
            Un temps écoulé compte comme une erreur normale.
          </p>
        ) : null}
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/revision"
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Revoir mes erreurs
        </Link>
        <Link
          href={isExam ? "/examen" : "/entrainement"}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          {isExam ? "Passer un autre examen" : "Nouvel entraînement"}
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          Accueil
        </Link>
      </div>

      <section className="mt-8" aria-labelledby="review-title">
        <h2 id="review-title" className="mb-3 text-lg font-semibold text-slate-950">
          Détail des réponses
        </h2>

        <ol className="space-y-4">
          {result.questions.map((question) => (
            <li
              key={question.position}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">
                  Question {question.position + 1}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                    question.isCorrect
                      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                      : question.timedOut
                        ? "bg-amber-50 text-amber-800 ring-amber-200"
                        : "bg-rose-50 text-rose-800 ring-rose-200"
                  }`}
                >
                  {question.isCorrect
                    ? "Correcte"
                    : question.timedOut
                      ? "Temps écoulé"
                      : "Incorrecte"}
                </span>
                {question.severity === "severe" ? (
                  <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-900">
                    Faute grave
                  </span>
                ) : null}
                <span className="text-xs text-slate-500">{question.chapterTitle}</span>
              </div>

              <h3 className="mt-2 leading-relaxed font-semibold text-slate-950">
                {question.prompt}
              </h3>

              {question.media ? (
                <Image
                  src={question.media.file}
                  alt={question.media.alt}
                  width={question.media.width}
                  height={question.media.height}
                  unoptimized
                  className="mt-4 h-auto w-full rounded-xl border border-slate-200"
                />
              ) : null}

              <ul className="mt-4 space-y-2">
                {question.options.map((option) => {
                  const isCorrectOption = option.id === question.correctOptionId;
                  const isSelected = option.id === question.selectedOptionId;

                  return (
                    <li
                      key={option.id}
                      className={`rounded-xl border p-3 text-sm ${
                        isCorrectOption
                          ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                          : isSelected
                            ? "border-rose-300 bg-rose-50 text-rose-950"
                            : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      <OptionContent option={option} />
                      {isCorrectOption ? (
                        <span className="ml-2 text-xs font-semibold text-emerald-800">
                          Bonne réponse
                        </span>
                      ) : null}
                      {isSelected && !isCorrectOption ? (
                        <span className="ml-2 text-xs font-semibold text-rose-800">
                          Votre réponse
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>

              {question.timedOut && question.selectedOptionId === null ? (
                <p className="mt-3 text-xs font-medium text-amber-800">
                  Aucune réponse enregistrée avant la fin du temps.
                </p>
              ) : null}

              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                <span className="font-semibold text-slate-900">Explication. </span>
                {question.explanation}
              </div>

              {question.sources.length > 0 ? (
                <p className="mt-3 text-xs text-slate-500">
                  Source :{" "}
                  {question.sources
                    .map((source) =>
                      source.page ? `${source.title}, p. ${source.page}` : source.title,
                    )
                    .join(" · ")}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
