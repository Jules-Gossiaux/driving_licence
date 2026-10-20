"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { saveLessonRunStepAction, submitTrainingAnswerAction } from "@/app/actions";
import type { LessonRunQuestionStep, LessonRunView } from "@/application/lesson-runs";
import type { TrainingFeedback } from "@/application/practice";
import { OptionContent } from "./option-content";

type Props = Pick<
  LessonRunView,
  | "attemptId"
  | "lessonTitle"
  | "lessonSlug"
  | "chapterSlug"
  | "chapterTitle"
  | "unitLabel"
  | "steps"
  | "initialStepIndex"
  | "completed"
  | "correctCount"
  | "questionCount"
  | "nextLesson"
>;

type AnsweredView = {
  position: number;
  selectedOptionId: string;
  correctOptionId: string;
  isCorrect: boolean;
  explanation: string;
  completed: boolean;
};

function optionLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

function answeredViewFromStep(step: LessonRunQuestionStep): AnsweredView {
  return {
    position: step.position,
    selectedOptionId: step.selectedOptionId ?? "",
    correctOptionId: step.correctOptionId ?? "",
    isCorrect: step.isCorrect === true,
    explanation: step.explanation ?? "",
    completed: false,
  };
}

export function LessonRunner(props: Props) {
  const {
    attemptId,
    lessonTitle,
    lessonSlug,
    chapterSlug,
    chapterTitle,
    unitLabel,
    steps,
    initialStepIndex,
    completed: initiallyCompleted,
    correctCount: initialCorrectCount,
    questionCount,
    nextLesson,
  } = props;

  const [stepIndex, setStepIndex] = useState(Math.min(initialStepIndex, Math.max(0, steps.length)));
  const [selected, setSelected] = useState<string | null>(null);
  const [submittedFeedback, setSubmittedFeedback] = useState<TrainingFeedback | null>(null);
  const [correctCount, setCorrectCount] = useState(initialCorrectCount);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const lessonHref = `/chapitres/${chapterSlug}/lecons/${lessonSlug}`;
  const completed = initiallyCompleted || stepIndex >= steps.length;
  const step = steps[stepIndex];
  const contentStepCount = steps.filter((candidate) => candidate.kind === "content").length;
  const progress = steps.length > 0 ? Math.min(100, ((stepIndex + 1) / steps.length) * 100) : 0;

  function persistStep(nextIndex: number) {
    startTransition(async () => {
      await saveLessonRunStepAction({ attemptId, stepIndex: nextIndex });
    });
  }

  function goToStep(nextIndex: number) {
    setStepIndex(nextIndex);
    setSelected(null);
    setSubmittedFeedback(null);
    setError(null);
    persistStep(nextIndex);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submitAnswer(questionStep: LessonRunQuestionStep) {
    if (!selected || pending) {
      return;
    }

    const optionId = selected;
    setError(null);

    startTransition(async () => {
      const result = await submitTrainingAnswerAction({
        attemptId,
        position: questionStep.position,
        optionId,
      });

      if (result.ok) {
        setSubmittedFeedback(result.feedback);
        if (result.feedback.isCorrect) {
          setCorrectCount((count) => count + 1);
        }
      } else {
        setError(result.message);
      }
    });
  }

  if (completed) {
    const primaryHref = nextLesson
      ? `/chapitres/${chapterSlug}/lecons/${nextLesson.slug}`
      : `/chapitres/${chapterSlug}`;
    const primaryLabel = nextLesson ? "Leçon suivante" : "Retour au chapitre";

    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href={lessonHref}
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            ← Quitter
          </Link>
          <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
            {unitLabel ? `Unité ${unitLabel}` : chapterTitle}
          </p>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-3xl text-emerald-700">
            ✓
          </div>
          <p className="mt-6 text-xs font-semibold tracking-[0.18em] text-emerald-700 uppercase">
            Parcours terminé
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Leçon terminée
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            {correctCount} réponse{correctCount > 1 ? "s" : ""} correcte
            {correctCount > 1 ? "s" : ""} sur {questionCount}. {lessonTitle} est validée.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={primaryHref}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
            >
              {primaryLabel}
            </Link>
            <Link
              href={lessonHref}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Revoir la leçon
            </Link>
          </div>

          {nextLesson ? (
            <p className="mt-5 text-xs text-slate-500">À suivre : {nextLesson.title}</p>
          ) : null}
        </section>
      </div>
    );
  }

  if (!step) {
    return null;
  }

  const questionStep = step.kind === "question" ? step : null;
  const answered = questionStep
    ? submittedFeedback?.position === questionStep.position
      ? submittedFeedback
      : questionStep.answered
        ? answeredViewFromStep(questionStep)
        : null
    : null;
  const feedback: AnsweredView | null = answered
    ? {
        position: answered.position,
        selectedOptionId: answered.selectedOptionId,
        correctOptionId: answered.correctOptionId,
        isCorrect: answered.isCorrect,
        explanation: answered.explanation,
        completed: answered.completed,
      }
    : null;
  const correctOption = questionStep
    ? questionStep.question.options.find((option) => option.id === feedback?.correctOptionId)
    : undefined;

  function optionClasses(optionId: string): string {
    const base =
      "flex w-full items-start gap-3 rounded-xl border p-4 text-left text-sm leading-relaxed transition-colors";

    if (!questionStep || feedback) {
      if (feedback) {
        if (optionId === feedback.correctOptionId) {
          return `${base} border-emerald-500 bg-emerald-50 text-emerald-950`;
        }
        if (optionId === feedback.selectedOptionId) {
          return `${base} border-rose-400 bg-rose-50 text-rose-950`;
        }
      }
      return `${base} border-slate-200 bg-white text-slate-500`;
    }

    return `${base} ${
      selected === optionId
        ? "border-slate-900 bg-slate-900 text-white"
        : "border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
    }`;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href={lessonHref} className="text-sm font-medium text-slate-500 hover:text-slate-900">
          ← Quitter
        </Link>
        <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
          {unitLabel ? `Unité ${unitLabel}` : chapterTitle} · {lessonTitle}
        </p>
      </div>

      <div className="mb-7 flex items-center gap-3">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-label="Progression de la leçon"
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={stepIndex + 1}
        >
          <div
            className="h-full rounded-full bg-emerald-600 transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs font-medium text-slate-500 tabular-nums">
          {stepIndex + 1}/{steps.length}
        </span>
      </div>

      {step.kind === "content" ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
            Section {step.sectionNumber} sur {contentStepCount}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {step.title}
          </h1>
          <div className="lesson-body mt-6">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{step.body}</ReactMarkdown>
          </div>
          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={() => goToStep(stepIndex + 1)}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Continuer
            </button>
          </div>
        </section>
      ) : questionStep ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
            {questionStep.purpose === "check" ? "Vérification" : "Question finale"} ·{" "}
            {questionStep.questionNumber}/{questionCount}
          </p>
          <h1 className="mt-2 text-xl leading-relaxed font-semibold text-slate-950 sm:text-2xl">
            {questionStep.question.prompt}
          </h1>

          {questionStep.question.media ? (
            <figure className="mt-5">
              <Image
                src={questionStep.question.media.file}
                alt={questionStep.question.media.alt}
                width={questionStep.question.media.width}
                height={questionStep.question.media.height}
                unoptimized
                className="h-auto w-full rounded-xl border border-slate-200"
              />
              {questionStep.question.media.caption ? (
                <figcaption className="mt-2 text-xs text-slate-500">
                  {questionStep.question.media.caption}
                </figcaption>
              ) : null}
            </figure>
          ) : null}

          <fieldset className="mt-6" disabled={Boolean(feedback) || pending}>
            <legend className="sr-only">Choisissez une réponse</legend>
            <div className="space-y-3">
              {questionStep.question.options.map((option, index) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected === option.id}
                  onClick={() => setSelected(option.id)}
                  className={optionClasses(option.id)}
                >
                  <span
                    className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-semibold ${
                      selected === option.id && !feedback
                        ? "border-white/40 text-white"
                        : "border-slate-300 text-slate-600"
                    }`}
                  >
                    {optionLetter(index)}
                  </span>
                  <OptionContent option={option} inverted={selected === option.id && !feedback} />
                </button>
              ))}
            </div>
          </fieldset>

          {error ? (
            <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
              {error}
            </p>
          ) : null}

          {feedback ? (
            <div
              className={`mt-6 rounded-xl border p-4 ${
                feedback.isCorrect
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-rose-200 bg-rose-50"
              }`}
            >
              <p
                className={`text-sm font-semibold ${
                  feedback.isCorrect ? "text-emerald-900" : "text-rose-900"
                }`}
              >
                {feedback.isCorrect ? "Bonne réponse" : "Réponse incorrecte"}
              </p>
              {!feedback.isCorrect && correctOption ? (
                <p className="mt-1 text-sm text-slate-700">
                  {correctOption.media ? (
                    "La bonne réponse est mise en évidence ci-dessus."
                  ) : (
                    <>
                      La bonne réponse est : <strong>{correctOption.label}</strong>
                    </>
                  )}
                </p>
              ) : null}
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{feedback.explanation}</p>
            </div>
          ) : null}

          <div className="mt-6 flex justify-end">
            {feedback ? (
              <button
                type="button"
                onClick={() =>
                  feedback.completed ? goToStep(steps.length) : goToStep(stepIndex + 1)
                }
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700"
              >
                {feedback.completed ? "Terminer la leçon" : "Continuer"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => submitAnswer(questionStep)}
                disabled={!selected || pending}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {pending ? "Enregistrement…" : "Valider la réponse"}
              </button>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
