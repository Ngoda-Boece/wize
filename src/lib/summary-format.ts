import type { SummaryContent } from "./types";

export const SUMMARY_SECTIONS: { key: keyof SummaryContent; label: string }[] = [
  { key: "keyConcepts", label: "Concepts clés" },
  { key: "arguments", label: "Arguments importants" },
  { key: "counterArguments", label: "Contre-arguments" },
  { key: "misconceptionsClarified", label: "Idées reçues clarifiées" },
  { key: "openQuestions", label: "Questions ouvertes" },
  { key: "takeaways", label: "À retenir" },
  { key: "nextSteps", label: "Prochaines étapes" },
];

/** Plain Markdown version used by the "copy" action. */
export function summaryToMarkdown(s: SummaryContent): string {
  const lines = [`# ${s.title}`, "", `**Sujet :** ${s.subject}`, `**Question centrale :** ${s.centralQuestion}`];
  if (s.initialHypothesis) lines.push(`**Hypothèse de départ :** ${s.initialHypothesis}`);
  for (const { key, label } of SUMMARY_SECTIONS) {
    const items = s[key];
    if (Array.isArray(items) && items.length) lines.push("", `## ${label}`, ...items.map((i) => `- ${i}`));
  }
  lines.push("", "## Exercice", s.exercise);
  return lines.join("\n");
}
