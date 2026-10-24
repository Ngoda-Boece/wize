"use client";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { saveProfileAction } from "@/lib/actions/app";
import { EXPERIENCE_LABELS, GOAL_LABELS, PREFERENCE_LABELS } from "@/lib/labels";
import {
  EXPERIENCE_LEVELS,
  INTERACTION_PREFERENCES,
  LEARNING_GOALS,
  type ExperienceLevel,
  type InteractionPreference,
  type LearningGoal,
  type Profile,
} from "@/lib/types";
import { ChoiceGroup, InterestPicker } from "./profile-inputs";

const STEPS = [
  { title: "Qu'est-ce qui t'intéresse ?", subtitle: "Choisis quelques domaines. Wize s'en servira pour te proposer des pistes." },
  { title: "Où en es-tu sur ces sujets ?", subtitle: "Pour ajuster le niveau des explications dès le départ." },
  { title: "Quel est ton objectif principal ?", subtitle: "Tu pourras en changer à tout moment dans les paramètres." },
  { title: "Comment préfères-tu qu'on échange ?", subtitle: "Le ton par défaut de Wize, quel que soit le mode choisi." },
] as const;

export function OnboardingFlow({ initial }: { initial: Profile | null }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [interests, setInterests] = useState<string[]>(initial?.learningInterests ?? []);
  const [level, setLevel] = useState<ExperienceLevel | null>(initial?.experienceLevel ?? null);
  const [goal, setGoal] = useState<LearningGoal | null>(initial?.learningGoal ?? null);
  const [preference, setPreference] = useState<InteractionPreference | null>(initial?.interactionPreference ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const goTo = (next: number) => {
    setStep(next);
    // Move focus to the new step title for keyboard and screen-reader users.
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const finish = () => {
    setError(null);
    startTransition(async () => {
      const result = await saveProfileAction(
        {
          displayName: displayName.trim() || null,
          learningInterests: interests,
          experienceLevel: level,
          learningGoal: goal,
          interactionPreference: preference,
          personalizationEnabled: initial?.personalizationEnabled ?? true,
        },
        { completeOnboarding: true },
      );
      if (result.ok) router.push("/app");
      else setError(result.error);
    });
  };

  const next = () => (step < STEPS.length - 1 ? goTo(step + 1) : finish());
  const current = STEPS[step]!;
  const answered = [interests.length > 0 || !!displayName.trim(), level !== null, goal !== null, preference !== null][step];

  return (
    <div>
      <div className="mb-8 flex gap-1.5" aria-hidden>
        {STEPS.map((_, i) => (
          <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-accent" : "bg-border"}`} />
        ))}
      </div>
      <p className="text-sm text-subtle">
        Étape {step + 1} sur {STEPS.length}
      </p>
      <h1 ref={headingRef} tabIndex={-1} className="mt-1 text-2xl font-semibold tracking-tight focus:outline-none">
        {current.title}
      </h1>
      <p className="mt-2 text-sm text-muted">{current.subtitle}</p>

      <div className="mt-7">
        {step === 0 ? (
          <div className="space-y-7">
            <Field label="Comment veux-tu qu'on t'appelle ? (facultatif)" htmlFor="displayName">
              <Input id="displayName" value={displayName} maxLength={80} onChange={(e) => setDisplayName(e.target.value)} autoComplete="given-name" />
            </Field>
            <InterestPicker value={interests} onChange={setInterests} />
          </div>
        ) : step === 1 ? (
          <ChoiceGroup
            legend="Ton niveau de familiarité"
            value={level}
            onChange={setLevel}
            options={EXPERIENCE_LEVELS.map((v) => ({ value: v, label: EXPERIENCE_LABELS[v] }))}
          />
        ) : step === 2 ? (
          <ChoiceGroup
            legend="Ton objectif principal"
            value={goal}
            onChange={setGoal}
            options={LEARNING_GOALS.map((v) => ({ value: v, label: GOAL_LABELS[v] }))}
          />
        ) : (
          <ChoiceGroup
            legend="Ton style d'interaction préféré"
            value={preference}
            onChange={setPreference}
            options={INTERACTION_PREFERENCES.map((v) => ({ value: v, label: PREFERENCE_LABELS[v] }))}
          />
        )}
      </div>

      {error ? (
        <Alert tone="error" className="mt-6">
          {error}
        </Alert>
      ) : null}

      <div className="mt-8 flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button variant="ghost" onClick={() => goTo(step - 1)} disabled={pending}>
            <ArrowLeft aria-hidden className="h-4 w-4" /> Retour
          </Button>
        ) : (
          <span />
        )}
        {/* Every question is optional: without an answer the button skips the step. */}
        <Button onClick={next} disabled={pending} variant={answered ? "primary" : "secondary"}>
          {pending
            ? "Enregistrement…"
            : step < STEPS.length - 1
              ? answered
                ? "Continuer"
                : "Passer"
              : answered
                ? "Terminer"
                : "Passer et terminer"}
          {!pending ? <ArrowRight aria-hidden className="h-4 w-4" /> : null}
        </Button>
      </div>
    </div>
  );
}
