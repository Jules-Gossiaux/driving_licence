import Link from "next/link";
import { startChapterExamAction, startUnitChallengeAction } from "@/app/actions";
import type {
  ChapterDetail,
  ChapterExamOverview,
  LessonSummary,
  UnitOverview,
} from "@/application/content-views";
import { formatDateTime, formatScore } from "@/lib/format";

const ROW_HEIGHT = 118;
const NODE_SIZE = 56;
const LABEL_BLOCK = 66;
const X_POSITIONS = [50, 78, 50, 22] as const;

type NodeState = "completed" | "current" | "locked";

function nodeX(index: number): number {
  return X_POSITIONS[index % X_POSITIONS.length] ?? 50;
}

function pathHeight(nodeCount: number): number {
  if (nodeCount === 0) {
    return 0;
  }
  return (nodeCount - 1) * ROW_HEIGHT + NODE_SIZE + LABEL_BLOCK;
}

function nodeStyle(index: number): { left: string; top: string } {
  return { left: `${nodeX(index)}%`, top: `${index * ROW_HEIGHT}px` };
}

function buildConnector(nodeCount: number): string {
  if (nodeCount < 2) {
    return "";
  }

  const points = Array.from({ length: nodeCount }, (_, index) => ({
    x: nodeX(index),
    y: index * ROW_HEIGHT + NODE_SIZE / 2,
  }));
  const [first, ...rest] = points;
  if (!first) {
    return "";
  }

  let path = `M ${first.x} ${first.y}`;
  let previous = first;
  for (const point of rest) {
    const middleY = (previous.y + point.y) / 2;
    path += ` C ${previous.x} ${middleY}, ${point.x} ${middleY}, ${point.x} ${point.y}`;
    previous = point;
  }
  return path;
}

function PathConnector({ nodeCount }: { nodeCount: number }) {
  const height = pathHeight(nodeCount);
  const path = buildConnector(nodeCount);

  if (!path) {
    return null;
  }

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
    >
      <path
        d={path}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={16}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={path}
        fill="none"
        stroke="#ffffff"
        strokeWidth={2}
        strokeDasharray="7 11"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
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
      className="h-6 w-6"
    >
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
      <path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.2l5.9-.9L12 3Z" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
    >
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H5v2a3 3 0 0 0 3 3M16 6h3v2a3 3 0 0 1-3 3" />
      <path d="M12 13v4M9 21h6M10 17h4" />
    </svg>
  );
}

function circleClass(state: NodeState, interactive: boolean): string {
  const stateClass =
    state === "completed"
      ? "bg-emerald-500 text-white shadow-[0_4px_0_#047857]"
      : state === "current"
        ? "bg-indigo-600 text-white shadow-[0_4px_0_#3730a3] ring-4 ring-indigo-200/70"
        : "bg-white text-slate-400 shadow-[0_4px_0_#e2e8f0] ring-2 ring-slate-200";

  return `grid h-14 w-14 shrink-0 place-items-center rounded-full text-base font-bold ${stateClass} ${
    interactive ? "transition-transform duration-150 group-hover:-translate-y-0.5" : ""
  }`;
}

function stateSublabel(state: NodeState): string {
  switch (state) {
    case "completed":
      return "Revoir";
    case "current":
      return "Commencer";
    default:
      return "Verrouillée";
  }
}

function LessonNode({
  chapterSlug,
  index,
  lesson,
}: {
  chapterSlug: string;
  index: number;
  lesson: LessonSummary;
}) {
  const state: NodeState = lesson.readAt ? "completed" : lesson.locked ? "locked" : "current";
  const body = (
    <>
      <span className={circleClass(state, state !== "locked")}>
        {state === "completed" ? (
          <CheckIcon />
        ) : state === "locked" ? (
          <LockIcon />
        ) : (
          <span className="tabular-nums">{lesson.order}</span>
        )}
      </span>
      <span
        className={`mt-3 line-clamp-2 w-32 text-xs font-semibold sm:w-44 ${
          state === "locked" ? "text-slate-400" : "text-slate-900"
        }`}
      >
        {lesson.title}
      </span>
      <span
        className={`mt-0.5 text-[11px] ${
          state === "completed"
            ? "font-medium text-emerald-700"
            : state === "current"
              ? "font-semibold text-indigo-700"
              : "text-slate-400"
        }`}
      >
        {stateSublabel(state)}
      </span>
    </>
  );

  if (state === "locked") {
    return (
      <li className="absolute w-32 -translate-x-1/2 text-center sm:w-44" style={nodeStyle(index)}>
        {body}
      </li>
    );
  }

  return (
    <li className="absolute w-32 -translate-x-1/2 text-center sm:w-44" style={nodeStyle(index)}>
      <Link
        href={`/chapitres/${chapterSlug}/lecons/${lesson.slug}`}
        aria-current={state === "current" ? "step" : undefined}
        className="group flex w-full flex-col items-center"
      >
        {body}
      </Link>
    </li>
  );
}

function ChallengeNode({
  chapterId,
  index,
  unit,
}: {
  chapterId: string;
  index: number;
  unit: UnitOverview;
}) {
  const { challenge } = unit;
  const latest = challenge.latestCompleted;
  const available = challenge.unlocked && challenge.questionCount > 0;
  const state: NodeState = !available ? "locked" : latest ? "completed" : "current";
  const action = !challenge.unlocked
    ? "Défi verrouillé"
    : challenge.questionCount === 0
      ? "Aucune question"
      : latest
        ? "Refaire le défi"
        : "Lancer le défi";
  const detail = latest
    ? formatScore(latest.score, latest.questionCount)
    : challenge.unlocked
      ? `${challenge.questionCount} questions`
      : `${unit.readLessonCount}/${unit.lessonCount} leçons`;

  return (
    <li className="absolute w-32 -translate-x-1/2 text-center sm:w-44" style={nodeStyle(index)}>
      <form action={startUnitChallengeAction} className="w-full">
        <input type="hidden" name="chapterId" value={chapterId} />
        <input type="hidden" name="unitId" value={unit.id} />
        <button
          type="submit"
          disabled={!available}
          aria-current={state === "current" ? "step" : undefined}
          className="group flex w-full flex-col items-center disabled:cursor-not-allowed"
        >
          <span className={circleClass(state, available)}>
            {state === "locked" ? <LockIcon /> : <StarIcon />}
          </span>
          <span className="mt-3 text-xs font-semibold text-slate-900">Défi {unit.label}</span>
          <span
            className={`mt-0.5 text-[11px] ${
              state === "completed"
                ? "font-medium text-emerald-700"
                : state === "current"
                  ? "font-semibold text-indigo-700"
                  : "text-slate-400"
            }`}
          >
            {action}
          </span>
          <span
            className="text-[11px] text-slate-400"
            title={
              latest?.completedAt
                ? `Dernier essai le ${formatDateTime(latest.completedAt)}`
                : undefined
            }
          >
            {detail}
          </span>
        </button>
      </form>
    </li>
  );
}

function UnitHeader({ headingId, unit }: { headingId: string; unit: UnitOverview }) {
  const percent =
    unit.lessonCount > 0 ? Math.round((unit.readLessonCount / unit.lessonCount) * 100) : 0;

  return (
    <header className="rounded-2xl bg-indigo-600 px-5 py-4 text-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-indigo-200 uppercase">
            Unité {unit.label}
          </p>
          <h3 id={headingId} className="mt-0.5 text-base font-semibold">
            {unit.title}
          </h3>
        </div>
        <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold tabular-nums">
          {unit.readLessonCount}/{unit.lessonCount}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`Progression de l'unité ${unit.label}`}
        aria-valuemin={0}
        aria-valuemax={unit.lessonCount}
        aria-valuenow={unit.readLessonCount}
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20"
      >
        <div className="h-full rounded-full bg-white" style={{ width: `${percent}%` }} />
      </div>
    </header>
  );
}

function UnitPath({ chapter, unit }: { chapter: ChapterDetail; unit: UnitOverview }) {
  const nodeCount = unit.lessons.length + 1;

  return (
    <section aria-labelledby={`unit-${unit.id}`}>
      <UnitHeader headingId={`unit-${unit.id}`} unit={unit} />
      <div
        className="relative mx-auto mt-5 max-w-lg"
        style={{ height: `${pathHeight(nodeCount)}px` }}
      >
        <PathConnector nodeCount={nodeCount} />
        <ol className="absolute inset-0">
          {unit.lessons.map((lesson, index) => (
            <LessonNode key={lesson.id} chapterSlug={chapter.slug} index={index} lesson={lesson} />
          ))}
          <ChallengeNode chapterId={chapter.id} index={unit.lessons.length} unit={unit} />
        </ol>
      </div>
    </section>
  );
}

function StandaloneLessonPath({ chapter }: { chapter: ChapterDetail }) {
  const nodeCount = chapter.lessons.length;

  return (
    <section aria-labelledby="lessons-title">
      <header className="rounded-2xl bg-slate-900 px-5 py-4 text-white shadow-sm">
        <h3 id="lessons-title" className="text-base font-semibold">
          Leçons
        </h3>
        <p className="mt-0.5 text-xs text-slate-300">
          {chapter.readLessonCount}/{chapter.lessonCount} terminée
          {chapter.lessonCount > 1 ? "s" : ""}
        </p>
      </header>
      <div
        className="relative mx-auto mt-5 max-w-lg"
        style={{ height: `${pathHeight(nodeCount)}px` }}
      >
        <PathConnector nodeCount={nodeCount} />
        <ol className="absolute inset-0">
          {chapter.lessons.map((lesson, index) => (
            <LessonNode key={lesson.id} chapterSlug={chapter.slug} index={index} lesson={lesson} />
          ))}
        </ol>
      </div>
    </section>
  );
}

export function ChapterPath({ chapter }: { chapter: ChapterDetail }) {
  if (chapter.units.length === 0) {
    return <StandaloneLessonPath chapter={chapter} />;
  }

  return (
    <div className="space-y-10">
      {chapter.units.map((unit) => (
        <UnitPath key={unit.id} chapter={chapter} unit={unit} />
      ))}
    </div>
  );
}

export function ChapterExamMilestone({
  chapter,
  exam,
}: {
  chapter: ChapterDetail;
  exam: ChapterExamOverview;
}) {
  const locked = !exam.unlocked;
  const latest = exam.latestCompleted;
  const missingLessons = chapter.readLessonCount < chapter.lessonCount;
  const missingQuestions = exam.availableQuestions < exam.questionCount;
  const badgeClass =
    latest?.passed === true
      ? "bg-emerald-500 text-white shadow-[0_5px_0_#047857]"
      : "bg-amber-400 text-slate-950 shadow-[0_5px_0_#b45309]";

  return (
    <section className="mt-10 overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-lg sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span
            className={`grid h-16 w-16 shrink-0 place-items-center rounded-full ring-4 ring-white/10 ${badgeClass}`}
          >
            <TrophyIcon />
          </span>
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-400 uppercase">
              Évaluation finale
            </p>
            <h2 className="mt-1 text-xl font-semibold">Examen du chapitre</h2>
            <p className="mt-1 text-sm text-slate-300">
              {exam.questionCount} questions · {exam.secondsPerQuestion} s · seuil{" "}
              {exam.passingScore}/{exam.questionCount}
            </p>
            {chapter.units.length === 1 ? (
              <p className="mt-1 text-xs text-slate-400">
                Périmètre : unité {chapter.units[0]?.label}
              </p>
            ) : null}
            {latest ? (
              <p className="mt-2 text-xs font-medium text-slate-200">
                Dernier essai : {formatScore(latest.score, latest.questionCount)} ·{" "}
                {latest.passed ? "réussi" : "échoué"} le {formatDateTime(latest.completedAt)}
              </p>
            ) : null}
            {locked ? (
              <p className="mt-2 text-xs font-medium text-slate-400">
                {missingLessons
                  ? `Terminez toutes les leçons (${chapter.readLessonCount}/${chapter.lessonCount}).`
                  : missingQuestions
                    ? `Banque insuffisante : ${exam.availableQuestions}/${exam.questionCount} questions.`
                    : "Examen indisponible."}
              </p>
            ) : null}
          </div>
        </div>
        <form action={startChapterExamAction} className="sm:shrink-0">
          <input type="hidden" name="chapterId" value={chapter.id} />
          <button
            type="submit"
            disabled={locked}
            className="w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-400 sm:w-auto"
          >
            {locked ? "Examen verrouillé" : latest ? "Repasser l'examen" : "Passer l'examen"}
          </button>
        </form>
      </div>
    </section>
  );
}
