"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitTrainingAnswerAction } from "@/app/actions";
import type { TrainingFeedback, TrainingQuestionView } from "@/application/practice";
import { OptionContent } from "./option-content";

type Props = {
  attemptId: string;
  title: string;
  mode: "practice" | "review";
  questions: TrainingQuestionView[];
  initialPosition: number;
};

function optionLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

export function PracticeRunner({ attemptId, title, mode, questions, initialPosition }: Props) {
  const router = useRouter();
  const [position, setPosition] = useState(initialPosition);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<TrainingFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const question = questions[position];
  const total = questions.length;

  if (!question) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-600">Cette session ne contient plus de question.</p>
        <button
          type="button"
          onClick={() => router.push(`/resultats/${attemptId}`)}
          className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Voir le résultat
        </button>
      </div>
    );
  }

  const feedbackForThisQuestion = feedback && feedback.position === position ? feedback : null;
  const answered = feedbackForThisQuestion !== null;

  function submitAnswer() {
    if (!question || !selected || pending) {
      return;
    }

    const optionId = selected;
    setError(null);

    startTransition(async () => {
      const result = await submitTrainingAnswerAction({
        attemptId,
        position,
        optionId,
      });

      if (result.ok) {
        setFeedback(result.feedback);
      } else {
        setError(result.message);
      }
    });
  }

  function goToNext() {
    if (!feedbackForThisQuestion) {
      return;
    }

    if (feedbackForThisQuestion.completed || feedbackForThisQuestion.nextPosition === null) {
      router.push(`/resultats/${attemptId}`);
      return;
    }

    setPosition(feedbackForThisQuestion.nextPosition);
    setSelected(null);
    setFeedback(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function optionClasses(optionId: string): string {
    const base =
      "flex w-full items-start gap-3 rounded-xl border p-4 text-left text-sm leading-relaxed transition-colors";

    if (!feedbackForThisQuestion) {
      return `${base} ${
        selected === optionId
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
      }`;
    }

    if (optionId === feedbackForThisQuestion.correctOptionId) {
      return `${base} border-emerald-500 bg-emerald-50 text-emerald-950`;
    }

    if (optionId === feedbackForThisQuestion.selectedOptionId) {
      return `${base} border-rose-400 bg-rose-50 text-rose-950`;
    }

    return `${base} border-slate-200 bg-white text-slate-500`;
  }

  const correctOption = question.options.find(
    (option) => option.id === feedbackForThisQuestion?.correctOptionId,
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
            {mode === "review" ? "Révision" : "Entraînement"} · {title}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            Question {position + 1} sur {total}
          </h1>
        </div>
        <div
          className="h-2 w-32 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-label="Progression de la session"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={position + 1}
        >
          <div
            className="h-full rounded-full bg-slate-900"
            style={{ width: `${((position + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg leading-relaxed font-semibold text-slate-950">{question.prompt}</h2>

        {question.media ? (
          <figure className="mt-5">
            <Image
              src={question.media.file}
              alt={question.media.alt}
              width={question.media.width}
              height={question.media.height}
              unoptimized
              className="h-auto w-full rounded-xl border border-slate-200"
            />
            {question.media.caption ? (
              <figcaption className="mt-2 text-xs text-slate-500">
                {question.media.caption}
              </figcaption>
            ) : null}
          </figure>
        ) : null}

        <fieldset className="mt-6" disabled={answered || pending}>
          <legend className="sr-only">Choisissez une réponse</legend>
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected === option.id}
                onClick={() => setSelected(option.id)}
                className={optionClasses(option.id)}
              >
                <span
                  className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-semibold ${
                    selected === option.id && !feedbackForThisQuestion
                      ? "border-white/40 text-white"
                      : "border-slate-300 text-slate-600"
                  }`}
                >
                  {optionLetter(index)}
                </span>
                <OptionContent
                  option={option}
                  inverted={selected === option.id && !feedbackForThisQuestion}
                />
              </button>
            ))}
          </div>
        </fieldset>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </p>
        ) : null}

        {feedbackForThisQuestion ? (
          <div
            className={`mt-6 rounded-xl border p-4 ${
              feedbackForThisQuestion.isCorrect
                ? "border-emerald-200 bg-emerald-50"
                : "border-rose-200 bg-rose-50"
            }`}
          >
            <p
              className={`text-sm font-semibold ${
                feedbackForThisQuestion.isCorrect ? "text-emerald-900" : "text-rose-900"
              }`}
            >
              {feedbackForThisQuestion.isCorrect ? "Bonne réponse" : "Réponse incorrecte"}
            </p>
            {!feedbackForThisQuestion.isCorrect && correctOption ? (
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
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              {feedbackForThisQuestion.explanation}
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {answered ? "La réponse est enregistrée." : "Une seule réponse est correcte."}
          </p>
          {answered ? (
            <button
              type="button"
              onClick={goToNext}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
            >
              {feedbackForThisQuestion?.completed ? "Voir le résultat" : "Question suivante"}
            </button>
          ) : (
            <button
              type="button"
              onClick={submitAnswer}
              disabled={!selected || pending}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {pending ? "Enregistrement…" : "Valider la réponse"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
