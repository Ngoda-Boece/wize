import type { Metadata } from "next";
import { HistoryList } from "@/components/app/history-list";
import { requireViewer } from "@/lib/auth/viewer";
import { getRepository } from "@/lib/data";

export const metadata: Metadata = { title: "Historique" };

export default async function HistoryPage() {
  const viewer = await requireViewer("/app/history");
  const repo = await getRepository(viewer);
  const [page, objectives] = await Promise.all([repo.listConversations({ limit: 20, offset: 0 }), repo.listObjectives()]);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Historique</h1>
        <p className="mt-2 text-muted">Toutes tes sessions, de la plus récente à la plus ancienne.</p>
      </header>
      <HistoryList
        initial={page.items}
        initialHasMore={page.hasMore}
        objectiveTitles={Object.fromEntries(objectives.map((o) => [o.id, o.title]))}
      />
    </div>
  );
}
