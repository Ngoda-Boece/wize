import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="contenu" className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Logo />
      <h1 className="mt-10 text-3xl font-semibold tracking-tight">Page introuvable</h1>
      <p className="mt-3 max-w-sm text-muted">Cette page n&apos;existe pas. Peut-être une idée à explorer ailleurs ?</p>
      <ButtonLink href="/" className="mt-8">
        Retour à l&apos;accueil
      </ButtonLink>
    </main>
  );
}
