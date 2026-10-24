import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export function Spinner({ className, label = "Chargement" }: { className?: string; label?: string }) {
  return (
    <span role="status" className="inline-flex">
      <LoaderCircle aria-hidden className={cn("h-4 w-4 animate-spin", className)} />
      <span className="sr-only">{label}</span>
    </span>
  );
}
