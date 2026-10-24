"use client";
import { MessagesSquare, Search, SearchX } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { listConversationsAction } from "@/lib/actions/app";
import type { Conversation } from "@/lib/types";
import { ConversationItem } from "./conversation-item";

export function HistoryList({
  initial,
  initialHasMore,
  objectiveTitles,
}: {
  initial: Conversation[];
  initialHasMore: boolean;
  objectiveTitles: Record<string, string>;
}) {
  const [items, setItems] = useState(initial);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const requestId = useRef(0);

  // Debounced server-side search.
  useEffect(() => {
    const q = query.trim();
    if (q === activeQuery) return;
    const timer = setTimeout(() => {
      const id = ++requestId.current;
      startTransition(async () => {
        const result = await listConversationsAction({ query: q || undefined, offset: 0 });
        if (id !== requestId.current) return;
        if (result.ok) {
          setItems(result.data.items);
          setHasMore(result.data.hasMore);
          setActiveQuery(q);
          setError(null);
        } else setError(result.error);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, activeQuery]);

  const loadMore = () => {
    startTransition(async () => {
      const result = await listConversationsAction({ query: activeQuery || undefined, offset: items.length });
      if (result.ok) {
        setItems((list) => [...list, ...result.data.items.filter((c) => !list.some((x) => x.id === c.id))]);
        setHasMore(result.data.hasMore);
      } else setError(result.error);
    });
  };

  if (!initial.length && !activeQuery && !query) {
    return (
      <EmptyState
        icon={MessagesSquare}
        title="Ton historique est vide"
        description="Chaque session que tu lances est conservée ici pour que tu puisses la reprendre plus tard."
        action={<ButtonLink href="/app/explore">Lancer une session</ButtonLink>}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <label htmlFor="history-search" className="sr-only">
          Rechercher par titre ou sujet
        </label>
        <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <input
          id="history-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={100}
          placeholder="Rechercher par titre ou sujet…"
          className="h-11 w-full rounded-[10px] border border-border bg-surface pl-10 pr-10 text-[15px] placeholder:text-subtle focus:border-accent focus:outline-none focus:ring-3 focus:ring-[var(--ring)]"
        />
        {pending ? (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-subtle">
            <Spinner label="Recherche en cours" />
          </span>
        ) : null}
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {items.length ? (
        <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-soft">
          {items.map((c) => (
            <ConversationItem
              key={c.id}
              conversation={c}
              objectiveTitle={c.objectiveId ? objectiveTitles[c.objectiveId] : null}
              onDeleted={(id) => setItems((list) => list.filter((x) => x.id !== id))}
              onRenamed={(updated) => setItems((list) => list.map((x) => (x.id === updated.id ? updated : x)))}
            />
          ))}
        </ul>
      ) : (
        <EmptyState icon={SearchX} title="Aucun résultat" description={`Aucune session ne correspond à « ${activeQuery} ».`} />
      )}

      {hasMore ? (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={loadMore} disabled={pending}>
            {pending ? "Chargement…" : "Charger plus"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
