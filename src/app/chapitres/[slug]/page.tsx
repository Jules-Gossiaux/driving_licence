import Link from "next/link";
import { notFound } from "next/navigation";
import {
  startChapterExamAction,
  startPracticeAction,
  startUnitChallengeAction,
} from "@/app/actions";
import type {
  ChapterDetail,
  ChapterExamOverview,
  LessonSummary,
  UnitOverview,
} from "@/application/content-views";
import { ContentNotFoundError } from "@/application/errors";
import { getChapterDetail } from "@/application/queries";
import { PageHeader, ProgressBar } from "@/components/ui";
import { getAppDependencies } from "@/infrastructure/container";
import { formatDateTime, formatScore } from "@/lib/format";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function LessonRow({ chapterSlug, lesson }: { chapterSlug: string; lesson: LessonSummary }) {
  const content = (
    <div className="flex items-start gap-4">
      <span
        className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${
          lesson.readAt
            ? "bg-emerald-100 text-emerald-800"
            : lesson.locked
              ? "bg-slate-100 text-slate-400"
              : "bg-slate-900 text-white"
        }`}
      >
        {lesson.readAt ? "✓" : String(lesson.order).padStart(2, "0")}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={`font-semibold ${lesson.locked ? "text-slate-400" : "text-slate-950"}`}>
            {lesson.title}
          </h3>
          {lesson.readAt ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 ring-inset">
              Terminée
            </span>
          ) : lesson.locked ? (
            <span className="text-xs font-medium text-slate-400">Verrouillée</span>
          ) : null}
        </div>
        <p
          className={`mt-1 line-clamp-1 text-sm ${lesson.locked ? "text-slate-400" : "text-slate-600"}`}
        >
          {lesson.summary}
        </p>
      </div>
    </div>
  );

  if (lesson.locked) {
    return <div className="block p-5">{content}</div>;
  }

  return (
    <Link
      href={`/chapitres/${chapterSlug}/lecons/${lesson.slug}`}
      className="block p-5 transition-colors hover:bg-slate-50"
    >
      {content}
    </Link>
  );
}

function UnitChallengeCard({ chapterId, unit }: { chapterId: string; unit: UnitOverview }) {
  const { challenge } = unit;
  const locked = !challenge.unlocked;
  const latest = challenge.latestCompleted;

  return (
    <div className="mt-3 flex flex-col gap-4 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-800">
            Défi
          </span>
          <h4 className="text-sm font-semibold text-slate-950">Défi {unit.label}</h4>
        </div>
        <p className="mt-1 text-xs text-slate-600">
          {challenge.questionCount} question{challenge.questionCount > 1 ? "s" : ""} mélangée
          {challenge.questionCount > 1 ? "s" : ""} · sans seuil
        </p>
        {latest ? (
          <p className="mt-1 text-xs text-slate-600">
            Dernier score : {formatScore(latest.score, latest.questionCount)} ·{" "}
            {formatDateTime(latest.completedAt)}
          </p>
        ) : null}
        {locked ? (
          <p className="mt-2 text-xs font-medium text-slate-500">
            Terminez les {unit.lessonCount} leçons de l&apos;unité pour le débloquer (
            {unit.readLessonCount}/{unit.lessonCount}).
          </p>
        ) : null}
      </div>
      <form action={startUnitChallengeAction}>
        <input type="hidden" name="chapterId" value={chapterId} />
        <input type="hidden" name="unitId" value={unit.id} />
        <button
          type="submit"
          disabled={locked || challenge.questionCount === 0}
          className="w-full rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:w-auto"
        >
          {locked
            ? "Défi verrouillé"
            : challenge.questionCount === 0
              ? "Aucune question"
              : latest
                ? "Refaire le défi"
                : "Lancer le défi"}
        </button>
      </form>
    </div>
  );
}

function ChapterExamCard({ chapter, exam }: { chapter: ChapterDetail; exam: ChapterExamOverview }) {
  const locked = !exam.unlocked;
  const latest = exam.latestCompleted;
  const missingLessons = chapter.readLessonCount < chapter.lessonCount;
  const missingQuestions = exam.availableQuestions < exam.questionCount;

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Évaluation finale
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">Examen du chapitre</h2>
          <p className="mt-1 text-sm text-slate-600">
            {exam.questionCount} questions · {exam.secondsPerQuestion} s · seuil {exam.passingScore}
            /{exam.questionCount}
          </p>
          {chapter.units.length === 1 ? (
            <p className="mt-1 text-xs text-slate-500">
              Périmètre actuel : unité {chapter.units[0]?.label}.
            </p>
          ) : null}
          {latest ? (
            <p className="mt-2 text-xs font-medium text-slate-600">
              Dernier essai : {formatScore(latest.score, latest.questionCount)} ·{" "}
              {latest.passed ? "réussi" : "échoué"} le {formatDateTime(latest.completedAt)}
            </p>
          ) : null}
          {locked ? (
            <p className="mt-2 text-xs font-medium text-slate-500">
              {missingLessons
                ? `Terminez toutes les leçons du chapitre (${chapter.readLessonCount}/${chapter.lessonCount}).`
                : missingQuestions
                  ? `Banque insuffisante : ${exam.availableQuestions}/${exam.questionCount} questions.`
                  : "Examen indisponible."}
            </p>
          ) : null}
        </div>
        <form action={startChapterExamAction}>
          <input type="hidden" name="chapterId" value={chapter.id} />
          <button
            type="submit"
            disabled={locked}
            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:w-auto"
          >
            {locked ? "Examen verrouillé" : latest ? "Repasser l'examen" : "Passer l'examen"}
          </button>
        </form>
      </div>
    </section>
  );
}

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

          {chapter.units.length > 0 ? (
            <div className="space-y-6">
              {chapter.units.map((unit) => (
                <section key={unit.id} aria-labelledby={`unit-${unit.id}`}>
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <h3 id={`unit-${unit.id}`} className="font-semibold text-slate-950">
                      <span className="mr-2 text-xs font-semibold tracking-wide text-slate-400">
                        {unit.label}
                      </span>
                      {unit.title}
                    </h3>
                    <span className="text-xs font-medium text-slate-500">
                      {unit.readLessonCount}/{unit.lessonCount} terminée
                      {unit.lessonCount > 1 ? "s" : ""}
                    </span>
                  </div>
                  <ol className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    {unit.lessons.map((lesson) => (
                      <li key={lesson.id}>
                        <LessonRow chapterSlug={chapter.slug} lesson={lesson} />
                      </li>
                    ))}
                  </ol>
                  <UnitChallengeCard chapterId={chapter.id} unit={unit} />
                </section>
              ))}
            </div>
          ) : (
            <ol className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {chapter.lessons.map((lesson) => (
                <li key={lesson.id}>
                  <LessonRow chapterSlug={chapter.slug} lesson={lesson} />
                </li>
              ))}
            </ol>
          )}

          {chapter.exam ? <ChapterExamCard chapter={chapter} exam={chapter.exam} /> : null}
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
