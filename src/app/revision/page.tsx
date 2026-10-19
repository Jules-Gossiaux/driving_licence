import Image from "next/image";
import Link from "next/link";
import { startReviewAction } from "@/app/actions";
import { getReviewItems } from "@/application/queries";
import { OptionContent } from "@/components/option-content";
import { EmptyState, PageHeader } from "@/components/ui";
import { getAppDependencies } from "@/infrastructure/container";

export const metadata = { title: "Révision des erreurs" };

export default function ReviewPage() {
  const items = getReviewItems(getAppDependencies());

  return (
    <div>
      <PageHeader
        eyebrow="Révision"
        title="Vos dernières erreurs"
        description="Pour chaque question, la dernière tentative terminée fait foi. Les corrections restent affichées ici pour être relues sans pression de temps."
        actions={
          items.length > 0 ? (
            <form action={startReviewAction}>
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Refaire ces questions
              </button>
            </form>
          ) : null
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title="Aucune erreur à réviser"
          description="Terminez un entraînement ou un examen pour alimenter cette page. Les questions répondues correctement lors de votre dernière tentative n'y apparaissent pas."
          action={
            <Link
              href="/entrainement"
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Aller à l&apos;entraînement
            </Link>
          }
        />
      ) : (
        <ol className="space-y-4">
          {items.map((item) => (
            <li
              key={item.questionId}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{item.chapterTitle}</span>
                <span aria-hidden="true">·</span>
                <span>{item.lessonTitles.join(" · ")}</span>
              </div>

              <h2 className="mt-2 leading-relaxed font-semibold text-slate-950">{item.prompt}</h2>

              {item.media ? (
                <Image
                  src={item.media.file}
                  alt={item.media.alt}
                  width={item.media.width}
                  height={item.media.height}
                  unoptimized
                  className="mt-4 h-auto w-full rounded-xl border border-slate-200"
                />
              ) : null}

              <ul className="mt-4 space-y-2">
                {item.options.map((option) => (
                  <li
                    key={option.id}
                    className={`rounded-xl border p-3 text-sm ${
                      option.id === item.correctOptionId
                        ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <OptionContent option={option} />
                    {option.id === item.correctOptionId ? (
                      <span className="ml-2 text-xs font-semibold text-emerald-800">
                        Bonne réponse
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>

              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                <span className="font-semibold text-slate-900">Explication. </span>
                {item.explanation}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <p>
                  Source :{" "}
                  {item.sources
                    .map((source) =>
                      source.page ? `${source.title}, p. ${source.page}` : source.title,
                    )
                    .join(" · ")}
                </p>
                <Link
                  href={`/chapitres/${item.chapterSlug}`}
                  className="font-medium text-slate-700 underline underline-offset-4 hover:text-slate-950"
                >
                  Revoir le chapitre
                </Link>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
