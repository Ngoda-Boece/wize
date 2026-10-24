import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = { title: "Conditions d'utilisation" };

export default function TermsPage() {
  return (
    <LegalPage title="Conditions d'utilisation" updated="22 octobre 2026">
      <h2>Le service</h2>
      <p>Wize est un outil d&apos;aide à la réflexion et à l&apos;apprentissage fondé sur l&apos;intelligence artificielle. Il t&apos;aide à explorer des sujets, à structurer ton raisonnement et à suivre ta progression.</p>

      <h2>Limites de l&apos;IA</h2>
      <p>
        Les réponses sont générées automatiquement et peuvent être incomplètes ou erronées. Elles ne remplacent pas l&apos;avis d&apos;un professionnel qualifié, notamment en matière médicale, juridique ou financière. Vérifie les informations importantes auprès de sources fiables.
      </p>
      <p>Wize ne mesure pas l&apos;intelligence ni les capacités cognitives de ses utilisateurs.</p>

      <h2>Utilisation acceptable</h2>
      <ul>
        <li>N&apos;utilise pas Wize pour produire des contenus illégaux, haineux ou destinés à nuire à autrui.</li>
        <li>Ne tente pas de contourner les mesures de sécurité ni d&apos;accéder aux données d&apos;autres utilisateurs.</li>
        <li>Les limites d&apos;usage (nombre de messages par minute) protègent la qualité du service pour tous.</li>
      </ul>

      <h2>Ton contenu</h2>
      <p>Tu restes responsable de ce que tu écris et propriétaire de tes idées. Tu peux supprimer tes conversations et ton compte à tout moment.</p>

      <h2>Évolution du service</h2>
      <p>Le service est en version initiale. Des fonctionnalités peuvent évoluer ; les changements importants de ces conditions te seront signalés.</p>
    </LegalPage>
  );
}
