import Link from "next/link";
import { notFound } from "next/navigation";
import {
  continueLessonAction,
  markLessonReadAction,
  startLessonRunAction,
  startLessonPracticeAction,
  startPracticeAction,
} from "@/app/actions";
import { ContentNotFoundError } from "@/application/errors";
import { getChapterDetail, getLessonDetail } from "@/application/queries";
import { MarkdownContent } from "@/components/markdown-content";
import { PageHeader } from "@/components/ui";
import { getAppDependencies } from "@/infrastructure/container";
import { formatDateTime } from "@/lib/format";

type PageProps = {
  params: Promise<{ slug: string; lessonSlug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { slug, lessonSlug } = await params;

  try {
    const detail = getLessonDetail(getAppDependencies(), slug, lessonSlug);
    return { title: detail.lesson.title };
  } catch {
    return { title: "Leçon introuvable" };
  }
}

export default async function LessonPage({ params }: PageProps) {
  const { slug, lessonSlug } = await params;
  const deps = getAppDependencies();

  let detail;
  let chapter;
  try {
    detail = getLessonDetail(deps, slug, lessonSlug);
    chapter = getChapterDetail(deps, slug);
  } catch (error) {
    if (error instanceof ContentNotFoundError) {
      notFound();
    }
    throw error;
  }

  const lessonIndex = chapter.lessons.findIndex((entry) => entry.id === detail.lesson.id);
  const previousLesson = lessonIndex > 0 ? chapter.lessons[lessonIndex - 1] : undefined;
  const nextLesson =
    lessonIndex >= 0 && lessonIndex < chapter.lessons.length - 1
      ? chapter.lessons[lessonIndex + 1]
      : undefined;
  const questionCount = detail.lesson.coreQuestionIds?.length ?? 0;
  const eyebrow = `${detail.unit ? `Unité ${detail.unit.label} · ` : ""}Leçon ${detail.lesson.order}`;

  if (detail.locked) {
    return (
      <div>
        <Link
          href={`/chapitres/${chapter.slug}`}
          className="mb-4 inline-flex text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          ← Chapitre {chapter.order}
        </Link>

        <PageHeader eyebrow={eyebrow} title={detail.lesson.title} />

        <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-2xl text-slate-500">
            ⌁
          </div>
          <h2 className="mt-5 text-xl font-semibold text-slate-950">Leçon verrouillée</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Terminez d&apos;abord
            {detail.previousLesson ? ` « ${detail.previousLesson.title} »` : " la leçon précédente"}
            .
          </p>
          {detail.previousLesson ? (
            <Link
              href={`/chapitres/${chapter.slug}/lecons/${detail.previousLesson.slug}`}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Ouvrir la leçon précédente
            </Link>
          ) : null}
        </section>
      </div>
    );
  }

  const startLabel = detail.activeRunAttemptId
    ? "Reprendre"
    : detail.readAt
      ? "Revoir la leçon"
      : "Commencer";

  return (
    <div>
      <Link
        href={`/chapitres/${chapter.slug}`}
        className="mb-4 inline-flex text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        ← Chapitre {chapter.order}
      </Link>

      <PageHeader
        eyebrow={eyebrow}
        title={detail.lesson.title}
        actions={
          detail.hasQuestions ? (
            <form action={startLessonRunAction}>
              <input type="hidden" name="lessonId" value={detail.lesson.id} />
              <button
                type="submit"
                className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                {startLabel}
              </button>
            </form>
          ) : (
            <>
              <form action={markLessonReadAction}>
                <input type="hidden" name="lessonId" value={detail.lesson.id} />
                <input type="hidden" name="chapterSlug" value={chapter.slug} />
                <input type="hidden" name="lessonSlug" value={detail.lesson.slug} />
                <input type="hidden" name="read" value={detail.readAt ? "false" : "true"} />
                <button
                  type="submit"
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
                    detail.readAt
                      ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      : "bg-emerald-700 text-white hover:bg-emerald-800"
                  }`}
                >
                  {detail.readAt ? "Marquer comme non lue" : "Marquer comme lue"}
                </button>
              </form>
              {detail.lesson.coreQuestionIds && detail.lesson.coreQuestionIds.length > 0 ? (
                <form action={startLessonPracticeAction}>
                  <input type="hidden" name="lessonId" value={detail.lesson.id} />
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
                  >
                    S&apos;entraîner sur cette leçon
                  </button>
                </form>
              ) : chapter.questionCount > 0 ? (
                <form action={startPracticeAction}>
                  <input type="hidden" name="chapterId" value={chapter.id} />
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
                  >
                    S&apos;entraîner
                  </button>
                </form>
              ) : null}
            </>
          )
        }
      />

      {detail.readAt ? (
        <p className="mb-5 inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 ring-inset">
          Terminée le {formatDateTime(detail.readAt)}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:col-span-2">
          {detail.hasQuestions ? (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-950">Au programme</h2>
                <p className="text-xs text-slate-500">
                  {detail.sections.length} sections · {questionCount} question
                  {questionCount > 1 ? "s" : ""}
                </p>
              </div>
              <ol className="mt-4 space-y-3">
                {detail.sections.map((section, index) => (
                  <li key={section.id} className="flex items-baseline gap-3 text-sm text-slate-700">
                    <span className="w-5 shrink-0 text-right text-xs font-semibold text-slate-400 tabular-nums">
                      {index + 1}
                    </span>
                    {section.title}
                  </li>
                ))}
              </ol>
              <p className="mt-6 text-xs leading-relaxed text-slate-500">
                Les questions s&apos;intercalent entre les sections. La leçon se valide à la fin.
              </p>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <h2 className="text-sm font-semibold text-amber-950">À retenir</h2>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-amber-900">
                  {detail.lesson.keyPoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-7">
                <MarkdownContent body={detail.lesson.body} mediaByFile={detail.mediaByFile} />
              </div>
            </>
          )}
        </article>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-950">Sources</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {detail.sources.map((source) => (
                <li key={`${source.documentId}-${source.page ?? source.locator ?? ""}`}>
                  {source.title}
                  {source.page ? `, p. ${source.page}` : ""}
                  {source.locator ? ` (${source.locator})` : ""}
                  {source.note ? (
                    <span className="mt-1 block text-xs text-slate-500">{source.note}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          {!detail.hasQuestions ? (
            <nav
              aria-label="Navigation entre les leçons"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="text-sm font-semibold text-slate-950">Continuer</h2>
              <div className="mt-3 space-y-3 text-sm">
                {previousLesson ? (
                  <Link
                    href={`/chapitres/${chapter.slug}/lecons/${previousLesson.slug}`}
                    className="block rounded-lg border border-slate-200 p-3 text-slate-700 hover:bg-slate-50"
                  >
                    <span className="block text-xs text-slate-500">Leçon précédente</span>
                    {previousLesson.title}
                  </Link>
                ) : null}
                {nextLesson ? (
                  <form action={continueLessonAction}>
                    <input type="hidden" name="lessonId" value={detail.lesson.id} />
                    <input type="hidden" name="chapterSlug" value={chapter.slug} />
                    <input type="hidden" name="nextLessonSlug" value={nextLesson.slug} />
                    <button
                      type="submit"
                      className="block w-full rounded-lg border border-slate-200 p-3 text-left text-slate-700 hover:bg-slate-50"
                    >
                      <span className="block text-xs text-slate-500">Leçon suivante</span>
                      {nextLesson.title}
                    </button>
                  </form>
                ) : (
                  <form action={continueLessonAction}>
                    <input type="hidden" name="lessonId" value={detail.lesson.id} />
                    <input type="hidden" name="chapterSlug" value={chapter.slug} />
                    <button
                      type="submit"
                      className="block w-full rounded-lg border border-slate-200 p-3 text-left text-slate-700 hover:bg-slate-50"
                    >
                      <span className="block text-xs text-slate-500">Dernière leçon</span>
                      Terminer le chapitre
                    </button>
                  </form>
                )}
              </div>
            </nav>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
