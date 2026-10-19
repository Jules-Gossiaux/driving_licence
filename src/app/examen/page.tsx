import Link from "next/link";
import { startExamAction } from "@/app/actions";
import { getDashboardView } from "@/application/queries";
import { PageHeader, ProgressBar } from "@/components/ui";
import { getAppDependencies } from "@/infrastructure/container";

export const metadata = { title: "Examen" };

export default function ExamHubPage() {
  const view = getDashboardView(getAppDependencies());

  return (
    <div>
      <PageHeader
        eyebrow="Examen blanc"
        title="Se mesurer au format de l'examen"
        description="Une question à la fois, avec un temps limité et sans correction immédiate. Le score applique les pénalités prévues par le preset."
      />

      {view.activeExam ? (
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold tracking-wide text-amber-800 uppercase">
              Examen en cours
            </p>
            <p className="mt-1 font-semibold text-amber-950">{view.activeExam.title}</p>
            <p className="mt-1 text-sm text-amber-800">
              Reprenez la question en cours. Le temps restant est calculé côté serveur.
            </p>
          </div>
          <Link
            href={`/examen/${view.activeExam.attemptId}`}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Reprendre
          </Link>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        {view.presets.map((preset) => (
          <article
            key={preset.id}
            className={`flex flex-col rounded-2xl border p-6 shadow-sm ${
              preset.isDemo ? "border-amber-200 bg-amber-50/60" : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-950">{preset.title}</h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  preset.locked ? "bg-slate-200 text-slate-700" : "bg-emerald-100 text-emerald-900"
                }`}
              >
                {preset.locked ? "Verrouillé" : "Disponible"}
              </span>
            </div>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-700">
              {preset.description}
            </p>

            <dl className="mt-5 grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-xl bg-white/80 p-3 ring-1 ring-slate-200 ring-inset">
                <dt className="text-xs text-slate-500">Questions</dt>
                <dd className="mt-1 text-lg font-semibold text-slate-950 tabular-nums">
                  {preset.questionCount}
                </dd>
              </div>
              <div className="rounded-xl bg-white/80 p-3 ring-1 ring-slate-200 ring-inset">
                <dt className="text-xs text-slate-500">Temps / question</dt>
                <dd className="mt-1 text-lg font-semibold text-slate-950 tabular-nums">
                  {preset.secondsPerQuestion} s
                </dd>
              </div>
              <div className="rounded-xl bg-white/80 p-3 ring-1 ring-slate-200 ring-inset">
                <dt className="text-xs text-slate-500">Seuil</dt>
                <dd className="mt-1 text-lg font-semibold text-slate-950 tabular-nums">
                  {preset.passingScore}/{preset.questionCount}
                </dd>
              </div>
            </dl>

            <div className="mt-5">
              <ProgressBar
                label="Questions disponibles"
                value={preset.availableQuestions}
                max={preset.questionCount}
              />
            </div>

            <p className="mt-3 text-xs leading-relaxed text-slate-600">
              {preset.isDemo
                ? "Questions de démonstration en brouillon : ce preset valide le format, pas la banque officielle."
                : preset.locked
                  ? "Le preset officiel s'active automatiquement quand la banque contient assez de questions publiées et validées."
                  : "Toutes les questions de ce preset sont publiées et validées."}
            </p>

            <div className="mt-5">
              {preset.locked ? (
                <button
                  type="button"
                  disabled
                  className="w-full cursor-not-allowed rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500"
                >
                  Examen indisponible
                </button>
              ) : (
                <form action={startExamAction}>
                  <input type="hidden" name="presetId" value={preset.id} />
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
                  >
                    {view.activeExam ? "Reprendre l'examen en cours" : "Démarrer l'examen"}
                  </button>
                </form>
              )}
            </div>
          </article>
        ))}
      </div>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Barème appliqué</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
          <li>Une réponse correcte ne retire aucun point.</li>
          <li>Une erreur normale retire 1 point.</li>
          <li>Une faute grave retire 5 points.</li>
          <li>Une question non répondue dans le temps imparti compte comme une erreur normale.</li>
          <li>Le score ne descend pas sous 0 ; la réussite dépend du seuil du preset.</li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Le format belge francophone visé est 50 questions, 15 secondes par question, avec 41
          bonnes réponses sur 50. Le preset officiel reste verrouillé tant que la banque
          n&apos;atteint pas ce volume de questions publiées.
        </p>
      </section>
    </div>
  );
}
