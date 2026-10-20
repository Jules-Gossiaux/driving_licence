import Link from "next/link";
import { getDashboardView } from "@/application/queries";
import { PageHeader, ProgressBar } from "@/components/ui";
import { getAppDependencies } from "@/infrastructure/container";

export const metadata = { title: "Chapitres" };

export default function ChaptersPage() {
  const view = getDashboardView(getAppDependencies());

  return (
    <div>
      <PageHeader title="Chapitres" />

      <div className="grid gap-5 md:grid-cols-2">
        {view.chapters.map((chapter) => (
          <article
            key={chapter.id}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Chapitre {chapter.order}
            </span>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">
              <Link href={`/chapitres/${chapter.slug}`} className="hover:underline">
                {chapter.title}
              </Link>
            </h2>
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
          </article>
        ))}
      </div>
    </div>
  );
}
