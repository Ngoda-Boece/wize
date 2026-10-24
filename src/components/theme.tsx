"use client";
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "wize-theme";

/** Inline script that applies the saved/system theme before first paint (no flash). */
export const themeScript = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}})();`;

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.theme ?? "light",
    () => "light",
  );
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // storage unavailable: the choice simply won't persist
        }
      }}
      aria-label={next === "dark" ? "Activer le thème sombre" : "Activer le thème clair"}
      className={cn("inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-muted transition-colors hover:bg-sunken hover:text-fg", className)}
    >
      {theme === "dark" ? <Sun aria-hidden className="h-4 w-4" /> : <Moon aria-hidden className="h-4 w-4" />}
    </button>
  );
}
