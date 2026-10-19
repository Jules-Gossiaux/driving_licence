import Link from "next/link";
import { getDashboardView } from "@/application/queries";
import { PageHeader, ProgressBar, StatusBadge } from "@/components/ui";
import { getAppDependencies } from "@/infrastructure/container";

export const metadata = { title: "Chapitres" };

export default function ChaptersPage() {
  const view = getDashboardView(getAppDependencies());

  return (
    <div>
      <PageHeader
        eyebrow="Théorie"
        title="Chapitres"
        description="Chaque chapitre rassemble les notions à retenir, leurs sources et les questions qui permettent de vérifier votre compréhension."
      />

      <div className="grid gap-5 md:grid-cols-2">
        {view.chapters.map((chapter) => (
          <article
            key={chapter.id}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Chapitre {chapter.order}
              </span>
              <StatusBadge status={chapter.status} />
            </div>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">
              <Link href={`/chapitres/${chapter.slug}`} className="hover:underline">
                {chapter.title}
              </Link>
            </h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{chapter.summary}</p>
            <div className="mt-5">
              <ProgressBar
                label="Leçons lues"
                value={chapter.readLessonCount}
                max={chapter.lessonCount}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {chapter.lessonCount} leçon{chapter.lessonCount > 1 ? "s" : ""} ·{" "}
              {chapter.questionCount} question{chapter.questionCount > 1 ? "s" : ""}
            </p>
            <Link
              href={`/chapitres/${chapter.slug}`}
              className="mt-5 inline-flex w-fit rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Ouvrir le chapitre
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
