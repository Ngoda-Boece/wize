import Link from "next/link";
import { cn } from "@/lib/cn";

/** Three linked nodes: the idea of connecting and testing ideas. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("h-7 w-7", className)}>
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <path d="M9 21.5 15.5 10.5 23 19" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity=".9" />
      <circle cx="9" cy="21.5" r="2.6" fill="#fff" />
      <circle cx="15.5" cy="10.5" r="2.6" fill="#fff" />
      <circle cx="23" cy="19" r="2.6" fill="#37D6C0" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 rounded-lg", className)} aria-label="Wize — accueil">
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-[0.14em] text-fg">WIZE</span>
    </Link>
  );
}
