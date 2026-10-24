"use client";
import {
  ChartColumn,
  Compass,
  LayoutDashboard,
  LogOut,
  Menu,
  MessagesSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Logo, LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";
import { signOutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/cn";

const NAV: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: "/app", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/app/explore", label: "Explorer", icon: Compass },
  { href: "/app/history", label: "Historique", icon: MessagesSquare },
  { href: "/app/progress", label: "Progression", icon: ChartColumn },
  { href: "/app/settings", label: "Paramètres", icon: Settings },
];

const COMPACT_KEY = "wize-sidebar-compact";

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  userLabel,
  notice,
  children,
}: {
  userLabel: string;
  notice: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [compact, setCompact] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      // Restoring a per-browser UI preference after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCompact(localStorage.getItem(COMPACT_KEY) === "1");
    } catch {
      // ignore
    }
  }, []);

  // Close the mobile menu after navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const toggleCompact = () => {
    const next = !compact;
    setCompact(next);
    try {
      localStorage.setItem(COMPACT_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
  };

  const isChat = pathname.startsWith("/app/chat/");

  return (
    <div className="flex min-h-dvh">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">
        Aller au contenu
      </a>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 md:flex",
          compact ? "w-[68px]" : "w-60",
        )}
      >
        <div className={cn("flex h-16 items-center", compact ? "justify-center" : "justify-between px-4")}>
          {compact ? (
            <Link href="/app" aria-label="Wize — tableau de bord" className="rounded-lg">
              <LogoMark />
            </Link>
          ) : (
            <Logo href="/app" />
          )}
        </div>
        <SidebarNav pathname={pathname} compact={compact} />
        <div className={cn("mt-auto space-y-1 border-t border-border p-3", compact && "px-2")}>
          <div className={cn("flex items-center", compact ? "flex-col gap-1" : "justify-between")}>
            <ThemeToggle />
            <button
              type="button"
              onClick={toggleCompact}
              aria-label={compact ? "Déplier la barre latérale" : "Replier la barre latérale"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-muted hover:bg-sunken hover:text-fg"
            >
              {compact ? <PanelLeftOpen aria-hidden className="h-4 w-4" /> : <PanelLeftClose aria-hidden className="h-4 w-4" />}
            </button>
          </div>
          <UserBlock userLabel={userLabel} compact={compact} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border bg-surface/95 px-3 backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-muted hover:bg-sunken"
          >
            <Menu aria-hidden className="h-5 w-5" />
          </button>
          <Logo href="/app" />
          <Link
            href="/app/explore"
            aria-label="Nouvelle session"
            className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-accent text-accent-fg"
          >
            <Plus aria-hidden className="h-5 w-5" />
          </Link>
        </header>

        {mobileOpen ? (
          <div className="fixed inset-0 z-40 md:hidden" id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu">
            <button type="button" aria-label="Fermer le menu" className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
            <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface shadow-card">
              <div className="flex h-14 items-center justify-between px-4">
                <Logo href="/app" />
                <ThemeToggle />
              </div>
              <SidebarNav pathname={pathname} compact={false} autoFocus />
              <div className="mt-auto border-t border-border p-3">
                <UserBlock userLabel={userLabel} compact={false} />
              </div>
            </div>
          </div>
        ) : null}

        {notice}
        <main id="contenu" className={cn("flex-1", isChat ? "flex min-h-0 flex-col" : "px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-10")}>
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarNav({ pathname, compact, autoFocus }: { pathname: string; compact: boolean; autoFocus?: boolean }) {
  return (
    <nav aria-label="Navigation de l'application" className={cn("space-y-1", compact ? "px-2" : "px-3")}>
      <Link
        href="/app/explore"
        autoFocus={autoFocus}
        className={cn(
          "mb-4 flex h-10 items-center gap-2 rounded-[10px] bg-accent text-sm font-medium text-accent-fg shadow-soft hover:bg-accent-hover",
          compact ? "justify-center" : "px-3",
        )}
        aria-label={compact ? "Nouvelle session" : undefined}
        title={compact ? "Nouvelle session" : undefined}
      >
        <Plus aria-hidden className="h-4 w-4" />
        {compact ? null : "Nouvelle session"}
      </Link>
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(pathname, href, exact);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            title={compact ? label : undefined}
            aria-label={compact ? label : undefined}
            className={cn(
              "flex h-10 items-center gap-3 rounded-[10px] text-sm transition-colors",
              compact ? "justify-center" : "px-3",
              active ? "bg-accent-soft font-medium text-accent-text" : "text-muted hover:bg-sunken hover:text-fg",
            )}
          >
            <Icon aria-hidden className="h-4 w-4 shrink-0" />
            {compact ? null : label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserBlock({ userLabel, compact }: { userLabel: string; compact: boolean }) {
  return (
    <form action={signOutAction} className={cn("flex items-center gap-2", compact ? "justify-center" : "justify-between pl-1")}>
      {compact ? null : (
        <span className="min-w-0 truncate text-sm text-muted" title={userLabel}>
          {userLabel}
        </span>
      )}
      <button
        type="submit"
        aria-label="Se déconnecter"
        title="Se déconnecter"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-muted hover:bg-sunken hover:text-fg"
      >
        <LogOut aria-hidden className="h-4 w-4" />
      </button>
    </form>
  );
}
