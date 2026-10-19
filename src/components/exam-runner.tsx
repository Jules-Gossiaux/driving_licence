"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { submitExamAnswerAction } from "@/app/actions";
import type { ExamSessionView } from "@/application/exam";

function optionLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

export function ExamRunner({ session }: { session: ExamSessionView }) {
  const deadline = new Date(session.deadlineAt).getTime();
  const totalMs = session.secondsPerQuestion * 1_000;
  const position = session.questionNumber - 1;

  const [selected, setSelected] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(session.remainingSeconds * 1_000);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    function tick() {
      setRemainingMs(Math.max(0, deadline - Date.now()));
    }

    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [deadline]);

  const sendAnswer = useCallback(
    async (optionId: string | null) => {
      if (submitting) {
        return;
      }

      setSubmitting(true);
      setError(null);

      const result = await submitExamAnswerAction({
        attemptId: session.attemptId,
        position,
        optionId,
      });

      if (result?.ok === false) {
        setError(result.message);
        setSubmitting(false);
      }
    },
    [position, session.attemptId, submitting],
  );

  useEffect(() => {
    if (remainingMs <= 0 && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true;
      void sendAnswer(null);
    }
  }, [remainingMs, sendAnswer]);

  const secondsLeft = Math.ceil(remainingMs / 1_000);
  const urgent = secondsLeft <= 5;
  const progressPercent = Math.min(100, Math.max(0, (remainingMs / totalMs) * 100));
  const locked = remainingMs <= 0 || submitting;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">
            {session.title}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            Question {session.questionNumber} sur {session.questionCount}
          </h1>
        </div>
        <div
          role="timer"
          aria-live="off"
          aria-label={`Temps restant : ${secondsLeft} secondes`}
          className={`rounded-2xl border px-4 py-2 text-center ${
            urgent
              ? "border-rose-300 bg-rose-50 text-rose-900"
              : "border-slate-200 bg-white text-slate-900"
          }`}
        >
          <span className="block text-2xl font-semibold tabular-nums">{secondsLeft}</span>
          <span className="block text-[11px] font-medium tracking-wide uppercase">secondes</span>
        </div>
      </div>

      <div className="mb-6 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-[width] ${
            urgent ? "bg-rose-500" : "bg-slate-900"
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg leading-relaxed font-semibold text-slate-950">
          {session.question.prompt}
        </h2>

        {session.question.media ? (
          <figure className="mt-5">
            <Image
              src={session.question.media.file}
              alt={session.question.media.alt}
              width={session.question.media.width}
              height={session.question.media.height}
              unoptimized
              className="h-auto w-full rounded-xl border border-slate-200"
            />
            {session.question.media.caption ? (
              <figcaption className="mt-2 text-xs text-slate-500">
                {session.question.media.caption}
              </figcaption>
            ) : null}
          </figure>
        ) : null}

        <fieldset className="mt-6" disabled={locked}>
          <legend className="sr-only">Choisissez une réponse</legend>
          <div className="space-y-3">
            {session.question.options.map((option, index) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected === option.id}
                onClick={() => setSelected(option.id)}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left text-sm leading-relaxed transition-colors ${
                  selected === option.id
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <span
                  className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-semibold ${
                    selected === option.id
                      ? "border-white/40 text-white"
                      : "border-slate-300 text-slate-600"
                  }`}
                >
                  {optionLetter(index)}
                </span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
            {error}
            {remainingMs <= 0 ? (
              <button
                type="button"
                onClick={() => void sendAnswer(null)}
                className="ml-2 font-semibold underline underline-offset-2"
              >
                Réessayer l&apos;envoi
              </button>
            ) : null}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {remainingMs <= 0
              ? "Temps écoulé : la question est envoyée comme non répondue."
              : "La réponse est définitive. Vous ne pouvez pas revenir en arrière."}
          </p>
          <button
            type="button"
            onClick={() => void sendAnswer(selected)}
            disabled={!selected || locked}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? "Envoi…" : "Valider la réponse"}
          </button>
        </div>
      </section>
    </div>
  );
}
