import Link from "next/link";
import { Logo } from "@/components/logo";

const groups = [
  {
    title: "Produit",
    links: [
      { href: "/#produit", label: "Découvrir Wize" },
      { href: "/#modes", label: "Modes d'interaction" },
      { href: "/#fonctionnement", label: "Fonctionnement" },
    ],
  },
  {
    title: "Compte",
    links: [
      { href: "/signup", label: "Créer un compte" },
      { href: "/login", label: "Se connecter" },
    ],
  },
  {
    title: "Informations",
    links: [
      { href: "/privacy", label: "Confidentialité" },
      { href: "/terms", label: "Conditions d'utilisation" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">Flex avec moi. Challenge tes idées, développe ta pensée.</p>
        </div>
        {groups.map((g) => (
          <nav key={g.title} aria-label={g.title}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-subtle">{g.title}</h2>
            <ul className="mt-3 space-y-2">
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted hover:text-fg">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-subtle sm:px-6">© {new Date().getFullYear()} Wize. Les réponses de l&apos;IA peuvent contenir des erreurs : garde ton esprit critique.</p>
      </div>
    </footer>
  );
}
