import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";
import { ButtonLink } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Navigation principale" className="flex items-center gap-1 sm:gap-2">
          <a href="#produit" className="hidden rounded-lg px-3 py-2 text-sm text-muted hover:text-fg md:inline-block">
            Produit
          </a>
          <a href="#modes" className="hidden rounded-lg px-3 py-2 text-sm text-muted hover:text-fg md:inline-block">
            Modes
          </a>
          <a href="#fonctionnement" className="hidden rounded-lg px-3 py-2 text-sm text-muted hover:text-fg md:inline-block">
            Fonctionnement
          </a>
          <ThemeToggle />
          <ButtonLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
            Se connecter
          </ButtonLink>
          <ButtonLink href="/signup" size="sm">
            Commencer
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
