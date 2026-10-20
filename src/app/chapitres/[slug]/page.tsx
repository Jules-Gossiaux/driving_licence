import Link from "next/link";
import { notFound } from "next/navigation";
import { startPracticeAction } from "@/app/actions";
import { ContentNotFoundError } from "@/application/errors";
import { getChapterDetail } from "@/application/queries";
import { PageHeader, ProgressBar } from "@/components/ui";
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
      <Link
        href="/chapitres"
        className="mb-4 inline-flex text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        ← Chapitres
      </Link>

      <PageHeader
        eyebrow={`Chapitre ${chapter.order}`}
        title={chapter.title}
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
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Brouillon — contenu à relire avant de s&apos;y fier.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2" aria-labelledby="lessons-title">
          <h2 id="lessons-title" className="mb-3 text-lg font-semibold text-slate-950">
            Leçons
          </h2>

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
                    {lesson.readAt ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 ring-inset">
                        Lue
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-slate-600">{lesson.summary}</p>
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
