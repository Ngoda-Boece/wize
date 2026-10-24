import type { Mode } from "@/lib/types";
import { aiError, type ChatProvider, type StreamParams } from "./provider";

// Deterministic, clearly simulated replies for demo mode and tests. They are
// labelled "Réponse simulée" in the UI and never presented as Claude output.
// Kept separate from the Anthropic integration on purpose.

const MODE_SCRIPTS: Record<Mode, (subject: string, turn: number) => string> = {
  sparring: (subject, turn) =>
    turn === 0
      ? `*Réponse simulée (mode démo).*\n\nOn peut aborder « ${subject} » sous plusieurs angles : les **faits** disponibles, les **hypothèses** implicites et les **contre-exemples** possibles.\n\nPour commencer : quelle est ta position, en une phrase, et quel est ton argument le plus solide pour la défendre ?`
      : `*Réponse simulée (mode démo).*\n\nSi je reformule, ta thèse repose sur une hypothèse implicite : que ce que tu observes se généralise. C'est un point défendable, mais il faut le tester.\n\n- **Force** : ton argument est concret.\n- **Fragilité** : il s'appuie sur peu de cas.\n\nQuel contre-exemple pourrait, selon toi, mettre ta position en difficulté ?`,
  mentor: (subject, turn) =>
    turn === 0
      ? `*Réponse simulée (mode démo).*\n\nBonne idée de travailler « ${subject} ». Je te propose un parcours en trois étapes : les notions de base, les mécanismes, puis un cas concret.\n\nAvant de commencer, qu'est-ce que tu sais déjà sur ce sujet, même approximativement ?`
      : `*Réponse simulée (mode démo).*\n\nTu as déjà une base. Ajoutons une notion clé : distinguer une **cause** d'une simple **corrélation**.\n\n> Deux phénomènes qui évoluent ensemble ne s'expliquent pas forcément l'un par l'autre.\n\nPetit exercice : peux-tu trouver un exemple de corrélation trompeuse dans ton quotidien ?`,
  socratic: (subject, turn) =>
    turn === 0
      ? `*Réponse simulée (mode démo).*\n\nPartons de ta propre intuition sur « ${subject} ». Selon toi, quelle est la toute première chose qu'il faudrait comprendre pour y répondre ?`
      : `*Réponse simulée (mode démo).*\n\nIntéressant. Qu'est-ce qui te fait penser que c'est vrai dans tous les cas, et pas seulement dans ceux que tu as en tête ?`,
  laboratory: (subject, turn) =>
    turn === 0
      ? `*Réponse simulée (mode démo).*\n\n**Hypothèse fictive :** tu diriges une petite organisation confrontée à une question liée à « ${subject} ». Tu disposes d'un budget limité et de trois mois.\n\nPremière décision : sur quoi concentres-tu tes ressources, et pourquoi ?`
      : `*Réponse simulée (mode démo).*\n\n**Conséquence fictive :** ta décision produit un premier résultat encourageant, mais un effet secondaire apparaît : une partie de ton équipe est surchargée.\n\nGardes-tu le cap ou ajustes-tu ta stratégie ? Compare au moins deux options.`,
};

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(aiError("aborted"));
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(aiError("aborted"));
      },
      { once: true },
    );
  });
}

export class MockProvider implements ChatProvider {
  readonly kind = "mock" as const;

  constructor(
    private mode: Mode,
    private subject: string,
    private chunkDelayMs = 25,
  ) {}

  async streamReply({ messages, signal, onText }: StreamParams) {
    const turn = messages.filter((m) => m.role === "assistant").length;
    const text = MODE_SCRIPTS[this.mode](this.subject, turn);
    // Emit word by word so the UI exercises the same streaming path as Claude.
    const chunks = text.match(/\S+\s*/g) ?? [text];
    for (const chunk of chunks) {
      await wait(this.chunkDelayMs, signal);
      onText(chunk);
    }
    return { stopReason: "end_turn" };
  }

  async generateSummary({ transcript }: { system: string; transcript: string }) {
    return buildMockSummary(this.subject, transcript);
  }
}

const STOP_WORDS = new Set(
  "alors aussi autre avant avec avoir cette comme comment dans depuis elles encore entre être faire leurs mais même moins notre nous parce pense plus pour pourquoi quand quelle quelles quels selon sont tout toute toutes très vraiment votre vous était serait peut doit simulée réponse démo certain certaine certains certaines beaucoup toujours jamais souvent chose choses quelque quelques".split(
    " ",
  ),
);

/** Deterministic summary built only from what the user actually wrote. */
export function buildMockSummary(subject: string, transcript: string) {
  const userLines = transcript
    .split("\n\n")
    .filter((b) => b.startsWith("Utilisateur :"))
    .map((b) => b.replace(/^Utilisateur :\s*/, "").trim())
    .filter(Boolean);

  const freq = new Map<string, number>();
  for (const word of userLines.join(" ").toLowerCase().match(/[a-zàâçéèêëîïôûùüÿœ-]{6,}/g) ?? []) {
    if (!STOP_WORDS.has(word)) freq.set(word, (freq.get(word) ?? 0) + 1);
  }
  const keyConcepts = [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([w]) => w);

  const firstSentence = (s: string) => (s.split(/(?<=[.!?])\s/)[0] ?? s).slice(0, 300);

  return {
    title: subject.slice(0, 160),
    subject: subject.slice(0, 500),
    centralQuestion: subject.slice(0, 600),
    keyConcepts,
    initialHypothesis: userLines[1] ? firstSentence(userLines[1]) : null,
    arguments: userLines.slice(1, 4).map(firstSentence),
    counterArguments: [],
    misconceptionsClarified: [],
    openQuestions: ["Synthèse simulée : les questions ouvertes seront identifiées par Claude une fois l'IA configurée."],
    takeaways: [],
    nextSteps: ["Reprendre la session pour approfondir un des points ci-dessus."],
    exercise: `Explique en trois phrases, sans notes, ce que tu retiens de la session « ${subject.slice(0, 120)} ».`,
  };
}
