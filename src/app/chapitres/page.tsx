import { getDashboardView } from "@/application/queries";
import { ChapterRoadmap } from "@/components/chapter-roadmap";
import { PageHeader } from "@/components/ui";
import { getAppDependencies } from "@/infrastructure/container";

export const metadata = { title: "Théorie" };

export default function ChaptersPage() {
  const view = getDashboardView(getAppDependencies());

  return (
    <div>
      <PageHeader title="Parcours théorique" />
      <ChapterRoadmap chapters={view.chapters} />
    </div>
  );
}
