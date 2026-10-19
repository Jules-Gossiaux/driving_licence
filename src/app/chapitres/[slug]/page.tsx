import Link from "next/link";
import { notFound } from "next/navigation";
import { startPracticeAction } from "@/app/actions";
import { ContentNotFoundError } from "@/application/errors";
import { getChapterDetail } from "@/application/queries";
import { PageHeader, ProgressBar, StatusBadge } from "@/components/ui";
import { getAppDependencies } from "@/infrastructure/container";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;

  try {
    return { title: getChapterDetail(getAppDependencies(), slug).title };
  } catch {
    return { title: "Chapitre introuvable" };
  }
}

export default async function ChapterPage({ params }: PageProps) {
  const { slug } = await params;

  let chapter;
  try {
    chapter = getChapterDetail(getAppDependencies(), slug);
  } catch (error) {
    if (error instanceof ContentNotFoundError) {
      notFound();
    }
    throw error;
  }

  return (
    <div>
      <nav aria-label="Fil d'Ariane" className="mb-4 text-sm text-slate-500">
        <Link href="/chapitres" className="hover:text-slate-900 hover:underline">
          Chapitres
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-slate-700">{chapter.title}</span>
      </nav>

      <PageHeader
        eyebrow={`Chapitre ${chapter.order}`}
        title={chapter.title}
        description={chapter.summary}
        actions={
          chapter.questionCount > 0 ? (
            <form action={startPracticeAction}>
              <input type="hidden" name="chapterId" value={chapter.id} />
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
              >
                S&apos;entraîner ({chapter.questionCount} question
                {chapter.questionCount > 1 ? "s" : ""})
              </button>
            </form>
          ) : null
        }
      />

      {!chapter.published ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
          <strong className="font-semibold">Contenu de démonstration.</strong> Ce chapitre est
          encore en brouillon : il sert à valider la structure et ne doit pas être considéré comme
          une source d&apos;examen fiable avant relecture.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2" aria-labelledby="lessons-title">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="lessons-title" className="text-lg font-semibold text-slate-950">
              Leçons
            </h2>
            <StatusBadge status={chapter.status} />
          </div>

          <ol className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {chapter.lessons.map((lesson) => (
              <li key={lesson.id}>
                <Link
                  href={`/chapitres/${chapter.slug}/lecons/${lesson.slug}`}
                  className="block p-5 transition-colors hover:bg-slate-50"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">
                      {String(lesson.order).padStart(2, "0")}
                    </span>
                    <h3 className="font-semibold text-slate-950">{lesson.title}</h3>
                    <StatusBadge status={lesson.status} />
                    {lesson.readAt ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 ring-inset">
                        Lue
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{lesson.summary}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {lesson.keyPoints.length} point
                    {lesson.keyPoints.length > 1 ? "s" : ""} clé
                    {lesson.keyPoints.length > 1 ? "s" : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-950">Progression</h2>
            <div className="mt-4">
              <ProgressBar
                label="Leçons lues"
                value={chapter.readLessonCount}
                max={chapter.lessonCount}
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Une leçon marquée comme lue reste modifiable à tout moment.
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-950">Sources</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {chapter.sources.map((source) => (
                <li key={`${source.documentId}-${source.page ?? source.locator ?? ""}`}>
                  {source.title}
                  {source.page ? `, p. ${source.page}` : ""}
                  {source.locator ? ` (${source.locator})` : ""}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
