# WIZE — « Flex avec moi »

Partenaire intellectuel propulsé par Claude : Wize aide à explorer un sujet, clarifier ses idées, tester ses hypothèses et suivre ce qu'on a réellement appris.

- **Stack** : Next.js 16 (App Router, Server Components, Server Actions, `proxy.ts`), React 19, TypeScript strict, Tailwind CSS 4, Supabase (Postgres + Auth + RLS, `@supabase/ssr`), SDK Anthropic TypeScript, Zod, react-markdown, Lucide.
- **Tests** : Vitest + Testing Library (unitaires), Playwright (bout en bout, desktop + mobile).

## Démarrage rapide

```bash
npm install
cp .env.example .env.local     # optionnel : sans configuration, l'app tourne en mode démo
npm run dev                    # http://localhost:3000
```

| Commande | Rôle |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build && npm start` | build et serveur de production |
| `npm run typecheck` | génération des types de routes + `tsc --noEmit` |
| `npm run lint` | ESLint (config Next core-web-vitals + TypeScript) |
| `npm test` | tests unitaires (Vitest) |
| `npx playwright install chromium && npm run build && npm run test:e2e` | tests E2E (en mode démo) |

## Modes de fonctionnement

| Configuration | Comportement |
|---|---|
| Rien de configuré | **Mode démo** : bouton « Entrer dans la démo », espace isolé par visiteur (cookie httpOnly), données **en mémoire** (perdues au redémarrage), réponses **simulées** et étiquetées comme telles. |
| Supabase seul | Comptes réels et persistance ; le chat affiche « service d'IA non configuré » (aucune réponse simulée en production). |
| Supabase + Anthropic | Mode complet. |
| `WIZE_MOCK_AI=1` (hors production) | Force les réponses simulées pour développer sans consommer l'API. |

Un bandeau dans l'application indique toujours si les données sont temporaires et si les réponses sont simulées.

## Configurer Supabase

1. Crée un projet sur supabase.com.
2. Applique la migration `supabase/migrations/20261022000000_init.sql` :
   - via la CLI : `supabase link --project-ref <ref>` puis `supabase db push` ;
   - ou colle le fichier dans l'éditeur SQL du tableau de bord.
3. Dans *Project Settings → API*, copie l'URL et la clé **publishable** dans `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (l'ancienne `NEXT_PUBLIC_SUPABASE_ANON_KEY` est aussi acceptée).
4. *Authentication → URL Configuration* : Site URL = `NEXT_PUBLIC_APP_URL`, et ajoute `<APP_URL>/auth/confirm` aux Redirect URLs (confirmation d'e-mail et réinitialisation de mot de passe).
5. Optionnel : `SUPABASE_SECRET_KEY` (serveur uniquement) pour que « Supprimer mon compte » supprime aussi l'identifiant d'authentification. Sans elle, les données sont effacées et l'utilisateur déconnecté ; l'interface indique honnêtement que l'identifiant doit être retiré par un administrateur.

Si la confirmation d'e-mail est désactivée, l'inscription mène directement à l'onboarding ; sinon un message invite à confirmer l'adresse.

## Configurer Anthropic

- `ANTHROPIC_API_KEY` : clé serveur (jamais exposée au navigateur).
- `ANTHROPIC_MODEL` : identifiant du modèle (défaut `claude-opus-5-5`).
- `ANTHROPIC_EFFORT` : `low` | `medium` (défaut) | `high`.
- `ANTHROPIC_REFUSAL_FALLBACK` : le repli serveur `fallbacks: "default"` (bêta `server-side-fallback-2026-07-01`) est **activé par défaut** pour les modèles compatibles : si un classifieur de sécurité refuse une requête légitime, l'API la rejoue sur un modèle de repli au lieu d'échouer. `off` pour le désactiver.

## Base de données (migration `20261022000000_init.sql`)

| Table | Contenu |
|---|---|
| `profiles` | prénom, intérêts, niveau, objectif, style préféré, `personalization_enabled`, `onboarding_completed` (créé automatiquement par trigger à l'inscription) |
| `conversations` | titre, sujet, mode, statut (`active`/`completed`), objectif lié |
| `messages` | rôle (`user`/`assistant`), contenu, statut (`complete`/`partial`), mode, clé d'idempotence `client_id` unique par conversation |
| `learning_objectives` | intitulé, description, type, statut, `completed_at` (cohérence garantie par contrainte) |
| `session_summaries` | synthèse JSONB (validée par Zod avant écriture et à la lecture), une par conversation |

RLS activé partout ; chaque politique compare à `auth.uid()`. Les messages ne peuvent être ajoutés qu'à une conversation de l'utilisateur et sont immuables (pas de droit `UPDATE`). Supprimer une conversation supprime ses messages et sa synthèse (`ON DELETE CASCADE`). Index sur `(user_id, updated_at desc)` et `(conversation_id, created_at)`.

La table `learning_events` suggérée n'a pas été créée : rien dans le MVP ne la lisait, et les statistiques sont calculées à partir des tables ci-dessus.

## Architecture

```
src/
  app/                      routes (landing, auth, onboarding, /app/*, API)
    api/chat/route.ts       streaming NDJSON → src/lib/chat-handler.ts
    api/conversations/[id]/summary/route.ts   brouillon de synthèse
    auth/confirm/route.ts   liens e-mail (token_hash ou code PKCE)
  proxy.ts                  rafraîchit la session Supabase, redirige /app si déconnecté
  components/               ui/ (primitives), app/, chat/, marketing/, profile/, auth/
  lib/
    ai/                     prompts/ (base + 4 modes), anthropic.ts, mock.ts, provider.ts,
                            schemas.ts (Zod), session-service.ts (contexte, persistance, synthèse)
    data/                   repository.ts (interface), supabase-repository.ts, demo-repository.ts
    actions/                Server Actions (app.ts, auth.ts)
    auth/                   viewer.ts (utilisateur dérivé de la session serveur), safe-next.ts
supabase/migrations/        schéma + RLS
tests/unit, tests/e2e
```

### Conversation et prompts

- Le prompt système est construit **côté serveur** : base Wize → instructions du mode → contexte utilisateur (sujet, profil si personnalisation active, objectif) entouré de `<user_context>` et neutralisé. Le client n'envoie qu'un id de conversation et un message ; le mode vient de la base.
- Contexte : les 40 derniers messages ; au-delà, le modèle est prévenu et la synthèse enregistrée (si elle existe) est injectée.
- Le premier message d'une session est son sujet ; le prompt impose un cadrage court + une seule question.
- Changement de mode en cours de session : persisté, les réponses suivantes l'utilisent, un séparateur l'indique dans le fil.

### Stratégie de reprise (streaming)

1. Le message utilisateur est enregistré **avant** l'appel à Claude (clé d'idempotence générée par le client : un double envoi renvoie `409 duplicate`, jamais de doublon).
2. Succès → réponse enregistrée `complete`.
3. Interruption (bouton Stop, coupure réseau, erreur fournisseur) après du texte → enregistrée `partial`, affichée « Réponse interrompue ».
4. Échec sans texte → rien n'est enregistré ; « Réessayer » envoie `retry: true`, qui régénère la réponse au dernier message utilisateur (refusé si une réponse existe déjà).
5. Envoi dont on ignore l'issue (réseau) → renvoi avec la même clé ; si le message était arrivé, le client bascule automatiquement sur `retry`.
6. Une seule génération à la fois par conversation ; 20 messages/minute par utilisateur ; 5 synthèses/minute.

Les erreurs du fournisseur sont converties en messages français neutres (aucune trace, clé ou message brut renvoyé au navigateur). Les journaux n'incluent pas le contenu des messages.

### Sécurité

Authentification vérifiée dans chaque page privée, Server Action et route API (le proxy n'est qu'une redirection anticipée) ; `user_id` toujours dérivé de la session ; dépôt de données scopé à l'utilisateur + RLS ; vérification d'Origin sur les routes JSON (les Server Actions l'ont nativement) ; limites de taille ; Markdown rendu sans HTML brut ni URL `javascript:` ; redirections post-connexion restreintes aux chemins relatifs ; en-têtes de sécurité (`X-Frame-Options`, `nosniff`, …).

## Tests exécutés

- `npm run typecheck` ✅ · `npm run lint` ✅ · `npm run build` ✅
- `npm test` : **48 tests unitaires** ✅ — accès (401, 403 cross-origin, 404 sur la conversation d'un autre), validation (JSON invalide, tailles, champs), flux complet de chat et persistance, configuration serveur des modes (le client ne peut pas l'imposer), idempotence, échec fournisseur + retry sans doublon, réponses partielles (erreur et Stop), 503 sans IA, verrou de concurrence, cloisonnement des données, suppression en cascade, pagination/recherche, statistiques vides honnêtes, validation des synthèses, mapping d'erreurs Anthropic, rendu Markdown sûr.
- `npm run test:e2e` : **14 scénarios Playwright** (7 × desktop + mobile) ✅ — landing, connexion/inscription, redirections, états vides, parcours complet (onboarding → session → streaming → relance → rechargement → changement de mode → synthèse → progression → accès refusé à un autre utilisateur → recherche/renommage/suppression), navigation, paramètres, absence de débordement horizontal.

Les E2E tournent en mode démo. **Le parcours Supabase réel et les appels réels à Claude n'ont pas été testés de bout en bout** (aucun identifiant disponible) : ils sont couverts par les tests unitaires du code qui les entoure, mais demandent une vérification manuelle une fois les clés configurées.

## Limites connues

- Mode démo : données en mémoire d'un seul processus serveur (perdues au redémarrage, non partagées entre instances).
- Rate limiting et verrou de génération en mémoire, par instance : pour plusieurs instances, utiliser un stockage partagé (Redis, Postgres).
- Les messages assistant sont écrits avec la session de l'utilisateur ; RLS l'autorise pour ses propres conversations. Un utilisateur pourrait donc, via l'API Supabase, insérer de faux messages « assistant » dans **ses** conversations (sans impact sur les autres). Pour l'empêcher, écrire ces messages avec la clé secrète côté serveur.
- Pas d'évaluation d'exercices par l'IA ni de « mémoire d'apprentissage » au-delà du profil et des synthèses.
- Pas de résumé automatique des très longues sessions : au-delà de 40 messages, seuls les plus récents (et la synthèse enregistrée) sont envoyés.
- Lien magique, facturation, recherche web, voix et analytics non implémentés.
- Pages légales provisoires (non revues juridiquement) ; interface en français uniquement (libellés centralisés dans `src/lib/labels.ts`).
