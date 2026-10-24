import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="contenu" className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-subtle">Dernière mise à jour : {updated}</p>
        <div className="mt-6 rounded-[10px] border border-warning-text/20 bg-warning-soft px-4 py-3 text-sm text-warning-text">
          Document provisoire décrivant le fonctionnement réel de l&apos;application. Il n&apos;a pas encore fait l&apos;objet d&apos;une revue juridique et ne constitue pas une déclaration de conformité.
        </div>
        <div className="prose-wize mt-8 [&_h2]:mt-10 [&_h2]:text-lg">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}
