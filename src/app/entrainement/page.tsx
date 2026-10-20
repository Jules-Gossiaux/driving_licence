import Link from "next/link";
import { startPracticeAction, startReviewAction } from "@/app/actions";
import { getDashboardView } from "@/application/queries";
import { EmptyState, PageHeader } from "@/components/ui";
import { getAppDependencies } from "@/infrastructure/container";

export const metadata = { title: "Entraînement" };

export default function TrainingHubPage() {
  const view = getDashboardView(getAppDependencies());
  const chaptersWithQuestions = view.chapters.filter((chapter) => chapter.questionCount > 0);

  return (
    <div>
      <PageHeader title="Entraînement" />

      {view.reviewCount > 0 ? (
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-amber-950">Revoir mes erreurs</h2>
            <p className="mt-1 text-sm text-amber-900">
              {view.reviewCount} question{view.reviewCount > 1 ? "s" : ""} à revoir.
            </p>
          </div>
          <form action={startReviewAction}>
            <button
              type="submit"
              className="rounded-xl bg-amber-950 px-4 py-2.5 text-sm font-semibold text-amber-50 hover:bg-amber-800"
            >
              Réviser
            </button>
          </form>
        </div>
      ) : null}

      {chaptersWithQuestions.length === 0 ? (
        <EmptyState
          title="Aucune question disponible"
          description="Aucun chapitre ne contient encore de questions."
          action={
            <Link
              href="/chapitres"
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Voir les chapitres
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {chaptersWithQuestions.map((chapter) => (
            <article
              key={chapter.id}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-slate-950">{chapter.title}</h2>
              <p className="mt-1 flex-1 text-sm text-slate-600">
                {chapter.questionCount} question{chapter.questionCount > 1 ? "s" : ""}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <form action={startPracticeAction}>
                  <input type="hidden" name="chapterId" value={chapter.id} />
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
                  >
                    S&apos;entraîner ({chapter.questionCount})
                  </button>
                </form>
                <Link
                  href={`/chapitres/${chapter.slug}`}
                  className="text-sm font-medium text-slate-700 underline underline-offset-4 hover:text-slate-950"
                >
                  Théorie
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
