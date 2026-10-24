import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Confidentialité" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Confidentialité" updated="22 octobre 2026">
      <h2>Données que nous conservons</h2>
      <ul>
        <li><strong>Compte</strong> : adresse e-mail et mot de passe chiffré, gérés par notre fournisseur d&apos;authentification (Supabase).</li>
        <li><strong>Profil d&apos;apprentissage</strong> (facultatif) : prénom, centres d&apos;intérêt, niveau déclaré, objectif principal et style d&apos;interaction préféré.</li>
        <li><strong>Sessions</strong> : titre, sujet, mode d&apos;interaction et messages échangés avec Wize.</li>
        <li><strong>Apprentissage</strong> : synthèses de session que tu choisis d&apos;enregistrer et objectifs que tu crées.</li>
      </ul>
      <p>Nous ne demandons aucune autre information personnelle. Évite de partager des données sensibles (santé, finances, informations sur des tiers) dans tes conversations.</p>

      <h2>Comment ces données sont utilisées</h2>
      <p>
        Pour générer une réponse, le message, les derniers échanges de la session et, si la personnalisation est activée, ton profil d&apos;apprentissage sont envoyés à notre fournisseur d&apos;IA (Anthropic, modèle Claude). Les synthèses sont générées de la même façon, à partir de la conversation concernée.
      </p>
      <p>Tes données ne sont ni vendues ni utilisées à des fins publicitaires. Les journaux techniques de l&apos;application n&apos;enregistrent pas le contenu de tes messages.</p>

      <h2>Personnalisation</h2>
      <p>Tu peux désactiver la personnalisation dans les paramètres : ton profil n&apos;est alors plus transmis à l&apos;IA. Le chat reste pleinement utilisable.</p>

      <h2>Tes contrôles</h2>
      <ul>
        <li>Supprimer une conversation (ses messages et sa synthèse sont supprimés avec elle).</li>
        <li>Supprimer une synthèse enregistrée.</li>
        <li>Modifier ou effacer ton profil d&apos;apprentissage.</li>
        <li>Supprimer ton compte et l&apos;ensemble de tes données depuis les paramètres.</li>
      </ul>

      <h2>Sécurité</h2>
      <p>Chaque enregistrement est rattaché à ton compte et protégé par des règles d&apos;accès au niveau de la base de données : aucun autre utilisateur ne peut le lire ni le modifier.</p>

      <h2>Contact</h2>
      <p>Pour toute question relative à tes données, contacte l&apos;équipe Wize. Les coordonnées définitives seront publiées avant l&apos;ouverture publique du service.</p>
    </LegalPage>
  );
}
