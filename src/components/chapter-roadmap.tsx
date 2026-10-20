import Link from "next/link";
import type { ChapterOverview } from "@/application/content-views";

type ChapterState = "completed" | "current" | "upcoming";

function chapterState(chapter: ChapterOverview, index: number, currentIndex: number): ChapterState {
  if (chapter.lessonCount > 0 && chapter.readLessonCount === chapter.lessonCount) {
    return "completed";
  }
  return index === currentIndex ? "current" : "upcoming";
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
    >
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

const stateLabels: Record<ChapterState, string> = {
  completed: "Terminé",
  current: "En cours",
  upcoming: "À venir",
};

const stateBadgeClasses: Record<ChapterState, string> = {
  completed: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  current: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  upcoming: "bg-slate-100 text-slate-600 ring-slate-200",
};

function callToAction(chapter: ChapterOverview, state: ChapterState): string {
  if (state === "completed") {
    return "Revoir le chapitre";
  }
  if (state === "current") {
    return chapter.readLessonCount > 0 ? "Continuer" : "Commencer";
  }
  return "Ouvrir";
}

function ChapterNode({ chapter, state }: { chapter: ChapterOverview; state: ChapterState }) {
  const circle =
    state === "completed"
      ? "bg-emerald-500 text-white shadow-[0_4px_0_#047857]"
      : state === "current"
        ? "bg-indigo-600 text-white shadow-[0_4px_0_#3730a3] ring-4 ring-indigo-200/70"
        : "bg-white text-slate-500 shadow-[0_4px_0_#e2e8f0] ring-2 ring-slate-200";

  return (
    <div
      aria-hidden="true"
      className={`grid h-16 w-16 place-items-center rounded-full text-lg font-bold ${circle}`}
    >
      {state === "completed" ? (
        <CheckIcon />
      ) : (
        <span className="tabular-nums">{chapter.order}</span>
      )}
    </div>
  );
}

function ChapterCard({
  chapter,
  state,
  side,
}: {
  chapter: ChapterOverview;
  state: ChapterState;
  side: "left" | "right";
}) {
  const percent =
    chapter.lessonCount > 0 ? Math.round((chapter.readLessonCount / chapter.lessonCount) * 100) : 0;
  const barClass =
    state === "completed"
      ? "bg-emerald-500"
      : state === "current"
        ? "bg-indigo-600"
        : "bg-slate-400";
  const cardClass =
    state === "current"
      ? "border-indigo-300 ring-4 ring-indigo-100"
      : state === "completed"
        ? "border-emerald-200"
        : "border-slate-200";

  return (
    <Link
      href={`/chapitres/${chapter.slug}`}
      aria-current={state === "current" ? "step" : undefined}
      className={`group flex h-full flex-col rounded-3xl border bg-white p-5 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md sm:p-6 ${cardClass} ${
        side === "left" ? "lg:col-start-1" : "lg:col-start-3"
      } lg:row-start-1`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
            Chapitre {chapter.order}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950 group-hover:text-indigo-700">
            {chapter.title}
          </h2>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${stateBadgeClasses[state]}`}
        >
          {stateLabels[state]}
        </span>
      </div>

      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">{chapter.summary}</p>

      <div className="mt-auto pt-5">
        <div
          role="progressbar"
          aria-label={`Progression du chapitre ${chapter.order}`}
          aria-valuemin={0}
          aria-valuemax={chapter.lessonCount}
          aria-valuenow={chapter.readLessonCount}
          className="h-2 overflow-hidden rounded-full bg-slate-100"
        >
          <div
            className={`h-full rounded-full transition-[width] ${barClass}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span className="tabular-nums">
            {chapter.readLessonCount}/{chapter.lessonCount} leçon
            {chapter.lessonCount > 1 ? "s" : ""}
          </span>
          <span className="tabular-nums">
            {chapter.questionCount} question{chapter.questionCount > 1 ? "s" : ""}
          </span>
        </div>
        <span
          className={`mt-4 inline-flex items-center gap-1.5 text-sm font-semibold ${
            state === "completed"
              ? "text-emerald-700"
              : state === "current"
                ? "text-indigo-700"
                : "text-slate-700"
          }`}
        >
          {callToAction(chapter, state)}
          <ArrowIcon />
        </span>
      </div>
    </Link>
  );
}

export function ChapterRoadmap({ chapters }: { chapters: ChapterOverview[] }) {
  const currentIndex = chapters.findIndex(
    (chapter) => chapter.lessonCount === 0 || chapter.readLessonCount < chapter.lessonCount,
  );

  return (
    <div className="relative mx-auto max-w-4xl">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-8 bottom-8 left-8 w-4 -translate-x-1/2 rounded-full bg-slate-200 lg:left-1/2"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-8 bottom-8 left-8 -translate-x-1/2 border-l-2 border-dashed border-white/90 lg:left-1/2"
      />

      <ol className="space-y-8">
        {chapters.map((chapter, index) => {
          const state = chapterState(chapter, index, currentIndex);
          const side = index % 2 === 0 ? "left" : "right";

          return (
            <li
              key={chapter.id}
              className="relative pl-20 lg:grid lg:grid-cols-[minmax(0,1fr)_6rem_minmax(0,1fr)] lg:items-start lg:pl-0"
            >
              <div className="absolute top-6 left-8 z-10 -translate-x-1/2 lg:static lg:col-start-2 lg:row-start-1 lg:translate-x-0 lg:justify-self-center lg:pt-4">
                <ChapterNode chapter={chapter} state={state} />
              </div>
              <ChapterCard chapter={chapter} state={state} side={side} />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
