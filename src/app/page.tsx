import Link from "next/link";
import { getDashboardView } from "@/application/queries";
import { EmptyState, PageHeader, ProgressBar, StatusBadge } from "@/components/ui";
import { getAppDependencies } from "@/infrastructure/container";
import { formatDateTime, formatScore, modeLabel } from "@/lib/format";

export const metadata = { title: "Tableau de bord" };

export default function DashboardPage() {
  const view = getDashboardView(getAppDependencies());
  const officialPreset = view.presets.find((preset) => !preset.isDemo);
  const demoPreset = view.presets.find((preset) => preset.isDemo);

  return (
    <div>
      <PageHeader
        eyebrow="Permis B · Belgique francophone"
        title="Votre préparation, sans détour"
        description="Révisez la théorie, confirmez chaque chapitre par des questions, puis mesurez-vous au format de l'examen."
      />

      {view.activeExam ? (
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold tracking-wide text-amber-800 uppercase">
              Examen en cours
            </p>
            <p className="mt-1 font-semibold text-amber-950">{view.activeExam.title}</p>
            <p className="mt-1 text-sm text-amber-800">
              Le chronomètre de la question en cours continue de tourner.
            </p>
          </div>
          <Link
            href={`/examen/${view.activeExam.attemptId}`}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Reprendre l&apos;examen
          </Link>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  Prochaine étape
                </p>
                {view.nextLesson ? (
                  <>
                    <h2 className="mt-1 text-xl font-semibold text-slate-950">
                      {view.nextLesson.title}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Reprenez la théorie là où vous l&apos;avez laissée.
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="mt-1 text-xl font-semibold text-slate-950">
                      Toutes les leçons sont lues
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Placez-vous en conditions d&apos;examen pour vérifier vos acquis.
                    </p>
                  </>
                )}
              </div>
              {view.nextLesson ? (
                <Link
                  href={`/chapitres/${view.nextLesson.chapterSlug}/lecons/${view.nextLesson.lessonSlug}`}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Continuer la leçon
                </Link>
              ) : (
                <Link
                  href="/examen"
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Passer un examen
                </Link>
              )}
            </div>
          </section>

          <section aria-labelledby="chapters-title">
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <h2 id="chapters-title" className="text-lg font-semibold text-slate-950">
                  Chapitres
                </h2>
                <p className="text-sm text-slate-600">
                  Théorie, points clés et questions d&apos;entraînement.
                </p>
              </div>
              <Link
                href="/chapitres"
                className="text-sm font-medium text-slate-700 underline underline-offset-4 hover:text-slate-950"
              >
                Tout voir
              </Link>
            </div>

            <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {view.chapters.map((chapter) => (
                <li key={chapter.id}>
                  <Link
                    href={`/chapitres/${chapter.slug}`}
                    className="block p-5 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-950">{chapter.title}</h3>
                      <StatusBadge status={chapter.status} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-600">
                      {chapter.summary}
                    </p>
                    <div className="mt-4 max-w-md">
                      <ProgressBar
                        label="Leçons lues"
                        value={chapter.readLessonCount}
                        max={chapter.lessonCount}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {chapter.questionCount} question
                      {chapter.questionCount > 1 ? "s" : ""} d&apos;entraînement
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="recent-title">
            <h2 id="recent-title" className="mb-3 text-lg font-semibold text-slate-950">
              Tentatives récentes
            </h2>
            {view.recentAttempts.length === 0 ? (
              <EmptyState
                title="Aucune tentative pour l'instant"
                description="Terminez un entraînement ou un examen pour suivre votre progression ici."
              />
            ) : (
              <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {view.recentAttempts.map((attempt) => (
                  <li key={attempt.id}>
                    <Link
                      href={`/resultats/${attempt.id}`}
                      className="flex flex-col gap-2 p-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{attempt.title}</p>
                        <p className="text-xs text-slate-500">
                          {modeLabel(attempt.mode)} · {formatDateTime(attempt.completedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="font-semibold text-slate-800 tabular-nums">
                          {attempt.score === null
                            ? "—"
                            : formatScore(attempt.score, attempt.questionCount)}
                        </span>
                        {attempt.passed === null ? null : (
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                              attempt.passed
                                ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                                : "bg-rose-50 text-rose-800 ring-rose-200"
                            }`}
                          >
                            {attempt.passed ? "Réussi" : "Échoué"}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Vos chiffres</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-xs font-medium text-slate-500">Questions répondues</dt>
                <dd className="mt-1 text-2xl font-semibold text-slate-950 tabular-nums">
                  {view.stats.answeredQuestions}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-xs font-medium text-slate-500">Taux de réussite</dt>
                <dd className="mt-1 text-2xl font-semibold text-slate-950 tabular-nums">
                  {view.accuracyPercent === null ? "—" : `${view.accuracyPercent} %`}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-xs font-medium text-slate-500">Tentatives terminées</dt>
                <dd className="mt-1 text-2xl font-semibold text-slate-950 tabular-nums">
                  {view.stats.completedAttempts}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-xs font-medium text-slate-500">Questions vues</dt>
                <dd className="mt-1 text-2xl font-semibold text-slate-950 tabular-nums">
                  {view.stats.distinctQuestions}
                </dd>
              </div>
            </dl>
          </section>

          {officialPreset ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-950">Examen officiel</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  {officialPreset.locked ? "Verrouillé" : "Disponible"}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {officialPreset.questionCount} questions · {officialPreset.secondsPerQuestion} s par
                question · {officialPreset.passingScore}/{officialPreset.questionCount} pour
                réussir.
              </p>
              <div className="mt-4">
                <ProgressBar
                  label="Questions publiées et validées"
                  value={officialPreset.availableQuestions}
                  max={officialPreset.questionCount}
                />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                {officialPreset.locked
                  ? "Le preset officiel reste verrouillé tant que la banque ne contient pas assez de questions publiées. L'examen démo permet déjà de tester le format."
                  : "La banque contient assez de questions pour lancer un examen complet."}
              </p>
              <Link
                href="/examen"
                className="mt-4 inline-flex text-sm font-semibold text-slate-800 underline underline-offset-4 hover:text-slate-950"
              >
                Voir les examens
              </Link>
            </section>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Erreurs à revoir</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {view.reviewCount === 0
                ? "Aucune erreur récente à réviser."
                : `${view.reviewCount} question${view.reviewCount > 1 ? "s" : ""} répondue${view.reviewCount > 1 ? "s" : ""} incorrectement lors de votre dernière tentative.`}
            </p>
            <Link
              href="/revision"
              className="mt-4 inline-flex text-sm font-semibold text-slate-800 underline underline-offset-4 hover:text-slate-950"
            >
              Ouvrir la révision
            </Link>
          </section>

          {demoPreset ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="text-base font-semibold text-amber-950">{demoPreset.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-amber-900">
                {demoPreset.questionCount} questions · {demoPreset.secondsPerQuestion} s par
                question. Les questions sont des brouillons de démonstration, à ne pas confondre
                avec une banque d&apos;examen validée.
              </p>
              <Link
                href="/examen"
                className="mt-4 inline-flex rounded-xl bg-amber-950 px-4 py-2 text-sm font-semibold text-amber-50 hover:bg-amber-800"
              >
                Tester le format
              </Link>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
