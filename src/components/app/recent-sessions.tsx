"use client";
import { MessagesSquare } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import type { Conversation } from "@/lib/types";
import { ConversationItem } from "./conversation-item";

export function RecentSessions({
  initial,
  objectiveTitles,
}: {
  initial: Conversation[];
  objectiveTitles: Record<string, string>;
}) {
  const [items, setItems] = useState(initial);
  if (!items.length) {
    return (
      <EmptyState
        icon={MessagesSquare}
        title="Aucune session pour l'instant"
        description="Tes conversations apparaîtront ici. Lance ta première session avec le formulaire ci-dessus."
      />
    );
  }
  return (
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
  );
}
