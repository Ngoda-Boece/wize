import {
  ArrowRight,
  BookOpen,
  Brain,
  Compass,
  Eye,
  Lightbulb,
  Route,
  Swords,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { IdeaNetwork } from "@/components/marketing/idea-network";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { ModeIcon } from "@/components/mode-icon";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { MODE_INFO } from "@/lib/labels";
import { MODES } from "@/lib/types";

const problems: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Eye,
    title: "On consomme l'information passivement",
    text: "Articles, vidéos, résumés : on accumule sans jamais vraiment mettre ce qu'on lit à l'épreuve.",
  },
  {
    icon: Brain,
    title: "On challenge rarement ses propres hypothèses",
    text: "Nos convictions restent confortables tant que personne ne les questionne sérieusement.",
  },
  {
    icon: BookOpen,
    title: "Le savoir ne devient pas compréhension durable",
    text: "Sans reformuler, appliquer et revenir sur ce qu'on apprend, l'essentiel s'efface en quelques jours.",
  },
];

const actions: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Compass, title: "Explorer", text: "Aborde n'importe quel sujet sous plusieurs angles, sans te perdre." },
  { icon: Lightbulb, title: "Réfléchir", text: "Clarifie ce que tu penses vraiment, et pourquoi tu le penses." },
  { icon: Swords, title: "Challenger", text: "Confronte tes idées aux meilleurs contre-arguments, avec honnêteté." },
  { icon: TrendingUp, title: "Progresser", text: "Garde une trace de ce que tu as compris et de ce qu'il reste à creuser." },
];

const steps = [
  { title: "Choisis un sujet", text: "Une question, une conviction, un domaine à découvrir ou une décision à préparer." },
  { title: "Réfléchis avec Wize", text: "Choisis un mode d'interaction : Wize explique, questionne ou te met au défi selon ton intention." },
  { title: "Consolide et suis ta progression", text: "Génère une synthèse fidèle à l'échange, fixe des objectifs et reviens sur les concepts clés." },
];

export default async function LandingPage({ searchParams }: PageProps<"/">) {
  const { compte } = await searchParams;
  return (
    <>
      <SiteHeader />
      <main id="contenu">
        {compte === "supprime" || compte === "donnees-supprimees" ? (
          <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
            <Alert tone="success">
              {compte === "supprime"
                ? "Ton compte et tes données ont été supprimés."
                : "Tes données ont été supprimées et tu as été déconnecté. Ton identifiant de connexion sera retiré par un administrateur."}
            </Alert>
          </div>
        ) : null}

        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 md:pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-8">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-mint" aria-hidden />
              Flex avec moi
            </p>
            <h1 className="text-[2.6rem] font-semibold leading-[1.05] tracking-[-0.03em] text-fg sm:text-6xl">
              Challenge tes idées.
              <br />
              <span className="text-accent-text">Développe ta pensée.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              L&apos;IA qui t&apos;aide à aller plus loin dans ta réflexion, à explorer de nouveaux domaines et à transformer ta curiosité en véritable connaissance.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/signup" size="lg">
                Commencer à réfléchir
                <ArrowRight aria-hidden className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink href="#produit" variant="secondary" size="lg">
                Découvrir Wize
              </ButtonLink>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[20px] border border-border bg-surface p-4 shadow-card sm:p-6">
              <IdeaNetwork />
              <div className="mt-2 space-y-3 border-t border-border pt-4 text-sm">
                <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-accent px-3.5 py-2 text-accent-fg">
                  Je pense que le talent compte plus que le travail.
                </p>
                <p className="max-w-[90%] rounded-2xl rounded-bl-md bg-sunken px-3.5 py-2 text-fg">
                  Qu&apos;entends-tu par « talent » ? Si c&apos;est une aptitude innée, comment expliquer les domaines où l&apos;entraînement délibéré fait la différence ?
                </p>
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-subtle">Exemple d&apos;échange en mode Sparring</p>
          </div>
        </section>

        {/* Problem */}
        <section className="border-y border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              Tu peux tout savoir sur un sujet sans vraiment le comprendre.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
              Consommer de l&apos;information n&apos;est pas comprendre. Comprendre, c&apos;est questionner, relier, reformuler et appliquer. C&apos;est précisément ce travail que Wize t&apos;aide à faire.
            </p>
            <ul className="mt-12 grid gap-6 md:grid-cols-3">
              {problems.map(({ icon: Icon, title, text }) => (
                <li key={title} className="rounded-[var(--radius-card)] border border-border bg-bg/60 p-6">
                  <Icon aria-hidden className="h-5 w-5 text-subtle" />
                  <h3 className="mt-4 font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Product */}
        <section id="produit" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <p className="text-sm font-medium text-accent-text">Le produit</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Un partenaire intellectuel, pas un distributeur de réponses.</h2>
          <ul className="mt-12 grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {actions.map(({ icon: Icon, title, text }) => (
              <li key={title} className="bg-surface p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
                  <Icon aria-hidden className="h-5 w-5" />
                </span>
                <h3 className="mt-5 font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Modes */}
        <section id="modes" className="scroll-mt-20 border-y border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <p className="text-sm font-medium text-accent-text">Modes d&apos;interaction</p>
            <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Quatre façons de faire travailler tes idées.</h2>
            <p className="mt-4 max-w-2xl text-muted">Tu choisis l&apos;intention, Wize adapte son comportement. Tu peux changer de mode en cours de session.</p>
            <ul className="mt-12 grid gap-4 md:grid-cols-2">
              {MODES.map((mode) => {
                const info = MODE_INFO[mode];
                return (
                  <li key={mode} className="flex gap-4 rounded-[var(--radius-card)] border border-border bg-bg/50 p-6">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-accent-text shadow-soft ring-1 ring-border">
                      <ModeIcon mode={mode} className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-semibold tracking-tight">
                        {info.label} <span className="font-normal text-subtle">— {info.tagline}</span>
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted">{info.description}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section id="fonctionnement" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
          <p className="text-sm font-medium text-accent-text">Fonctionnement</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Trois étapes, aucune complication.</h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="relative">
                <span className="text-sm font-semibold text-accent-text tabular-nums">0{i + 1}</span>
                <h3 className="mt-2 text-lg font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12 flex items-start gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-5 text-sm text-muted">
            <Route aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-subtle" />
            <p>
              Wize distingue les faits établis, les interprétations et les hypothèses, et reconnaît quand il ne sait pas. Il ne mesure pas ton intelligence et n&apos;invente pas de sources.
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 pb-20 sm:px-6">
          <div className="mx-auto max-w-6xl rounded-[24px] bg-ink px-6 py-16 text-center sm:px-12">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Et si tu allais plus loin dans ta façon de penser ?
            </h2>
            <div className="mt-8 flex justify-center">
              <ButtonLink href="/signup" variant="inverse" size="lg">
                Flex avec Wize
                <ArrowRight aria-hidden className="h-4 w-4" />
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
