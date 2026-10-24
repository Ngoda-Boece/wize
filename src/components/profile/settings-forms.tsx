"use client";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { deleteAllDataAction, saveProfileAction } from "@/lib/actions/app";
import { deleteAccountAction } from "@/lib/actions/auth";
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
import { InterestPicker } from "./profile-inputs";

export function PreferencesForm({ profile }: { profile: Profile }) {
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [interests, setInterests] = useState(profile.learningInterests);
  const [level, setLevel] = useState<ExperienceLevel | "">(profile.experienceLevel ?? "");
  const [goal, setGoal] = useState<LearningGoal | "">(profile.learningGoal ?? "");
  const [preference, setPreference] = useState<InteractionPreference | "">(profile.interactionPreference ?? "");
  const [personalization, setPersonalization] = useState(profile.personalizationEnabled);
  const [status, setStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const result = await saveProfileAction({
        displayName: displayName.trim() || null,
        learningInterests: interests,
        experienceLevel: level || null,
        learningGoal: goal || null,
        interactionPreference: preference || null,
        personalizationEnabled: personalization,
      });
      setStatus(result.ok ? { tone: "success", text: "Préférences enregistrées." } : { tone: "error", text: result.error });
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-6"
    >
      <Field label="Prénom ou pseudo" htmlFor="settings-name">
        <Input id="settings-name" value={displayName} maxLength={80} onChange={(e) => setDisplayName(e.target.value)} />
      </Field>
      <div className="space-y-2">
        <p className="text-sm font-medium">Centres d&apos;intérêt</p>
        <InterestPicker value={interests} onChange={setInterests} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Familiarité" htmlFor="settings-level">
          <Select id="settings-level" value={level} onChange={(e) => setLevel(e.target.value as ExperienceLevel | "")}>
            <option value="">Non précisé</option>
            {EXPERIENCE_LEVELS.map((v) => (
              <option key={v} value={v}>
                {EXPERIENCE_LABELS[v]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Objectif principal" htmlFor="settings-goal">
          <Select id="settings-goal" value={goal} onChange={(e) => setGoal(e.target.value as LearningGoal | "")}>
            <option value="">Non précisé</option>
            {LEARNING_GOALS.map((v) => (
              <option key={v} value={v}>
                {GOAL_LABELS[v]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Style d'interaction" htmlFor="settings-pref">
          <Select id="settings-pref" value={preference} onChange={(e) => setPreference(e.target.value as InteractionPreference | "")}>
            <option value="">Non précisé</option>
            {INTERACTION_PREFERENCES.map((v) => (
              <option key={v} value={v}>
                {PREFERENCE_LABELS[v]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-2 p-4">
        <input
          type="checkbox"
          checked={personalization}
          onChange={(e) => setPersonalization(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
        />
        <span>
          <span className="block text-sm font-medium">Personnalisation</span>
          <span className="mt-0.5 block text-sm leading-relaxed text-muted">
            Quand elle est activée, ton profil (prénom, intérêts, niveau, objectif, style) est transmis à l&apos;IA pour adapter ses
            réponses. Désactivée, Wize fonctionne normalement sans ces informations.
          </span>
        </span>
      </label>

      {status ? <Alert tone={status.tone}>{status.text}</Alert> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}

export function DangerZone({ canDeleteAuthAccount, isDemo }: { canDeleteAuthAccount: boolean; isDemo: boolean }) {
  const [dialog, setDialog] = useState<"data" | "account" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      if (dialog === "data") {
        const result = await deleteAllDataAction();
        if (result.ok) {
          setDialog(null);
          setNotice("Toutes tes données d'apprentissage ont été supprimées.");
        } else setError(result.error);
      } else {
        // Redirects on success.
        const result = await deleteAccountAction();
        setError(result.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      <div className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Effacer mes données</p>
          <p className="mt-0.5 text-sm text-muted">Conversations, synthèses, objectifs et profil. Ton compte reste actif.</p>
        </div>
        <Button variant="secondary" onClick={() => setDialog("data")}>
          Effacer
        </Button>
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-danger/30 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-danger">Supprimer mon compte</p>
          <p className="mt-0.5 text-sm text-muted">
            {isDemo
              ? "Efface ton espace de démo et te déconnecte."
              : canDeleteAuthAccount
                ? "Supprime définitivement ton compte et toutes tes données."
                : "Supprime toutes tes données et te déconnecte. Ton identifiant de connexion sera retiré ensuite par un administrateur."}
          </p>
        </div>
        <Button variant="danger" onClick={() => setDialog("account")}>
          Supprimer
        </Button>
      </div>
      <ConfirmDialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        onConfirm={confirm}
        pending={pending}
        error={error}
        confirmLabel={dialog === "account" ? "Supprimer mon compte" : "Tout effacer"}
        title={dialog === "account" ? "Supprimer ton compte ?" : "Effacer toutes tes données ?"}
        description="Cette action est définitive et ne peut pas être annulée."
      />
    </div>
  );
}
