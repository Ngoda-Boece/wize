import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <ThemeToggle />
      </header>
      <main id="contenu" className="flex flex-1 items-start justify-center px-4 pb-16 pt-8 sm:items-center sm:pt-0">
        <div className="w-full max-w-[400px]">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p> : null}
          <div className="mt-7 rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-soft sm:p-6">{children}</div>
          {footer ? <div className="mt-5 text-center text-sm text-muted">{footer}</div> : null}
          <p className="mt-8 text-center text-xs text-subtle">
            <Link href="/privacy" className="hover:text-fg">
              Confidentialité
            </Link>{" "}
            ·{" "}
            <Link href="/terms" className="hover:text-fg">
              Conditions
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
