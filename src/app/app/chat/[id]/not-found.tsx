import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function ChatNotFound() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16">
      <EmptyState
        icon={SearchX}
        title="Session introuvable"
        description="Cette conversation n'existe pas ou ne t'appartient pas."
        action={<ButtonLink href="/app/history">Voir mes sessions</ButtonLink>}
      />
    </div>
  );
}
