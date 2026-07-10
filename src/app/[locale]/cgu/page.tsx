import LegalPageLayout from "@/components/LegalPageLayout";

export default async function CGUPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <LegalPageLayout locale={locale} titre="Conditions generales d'utilisation">
      <p>
        Les presentes conditions regissent l'utilisation de la plateforme AfriTable,
        qui met en relation des restaurants et des clients pour la reservation de
        table, la precommande a emporter et en livraison.
      </p>
      <p>
        <strong>1. Objet</strong>
        <br />
        AfriTable propose aux restaurants un outil de gestion (reservations,
        commandes, plan de salle, caisse, menu, fidelite) et une page publique
        permettant a leurs clients de reserver ou commander en ligne.
      </p>
      <p>
        <strong>2. Inscription des restaurants</strong>
        <br />
        Chaque restaurant beneficie d'un espace de gestion accessible via des
        identifiants personnels. Le restaurant est responsable de la
        confidentialite de ses identifiants et de l'exactitude des informations
        qu'il publie (menu, prix, disponibilites).
      </p>
      <p>
        <strong>3. Paiements</strong>
        <br />
        Les paiements en ligne sont traites par des prestataires tiers (CinetPay,
        ElyonPay). AfriTable ne stocke aucune donnee bancaire et n'intervient pas
        dans le traitement technique des transactions, qui relevent de la
        responsabilite de ces prestataires.
      </p>
      <p>
        <strong>4. Responsabilite</strong>
        <br />
        AfriTable met a disposition un outil technique et ne saurait etre tenu
        responsable de la qualite du service, des produits ou de la livraison
        assures directement par chaque restaurant.
      </p>
      <p>
        <strong>5. Abonnement</strong>
        <br />
        L'acces a la plateforme pour les restaurants est soumis a un abonnement
        dont les modalites (tarifs, duree) sont precisees sur la page Tarifs.
      </p>
      <p style={{ fontSize: 13, color: "#6B7280", marginTop: 32, fontStyle: "italic" }}>
        Ce document est un modele de base fourni a titre indicatif et n'a pas ete
        relu par un professionnel du droit. Il est recommande de le faire verifier
        avant toute utilisation commerciale reelle.
      </p>
    </LegalPageLayout>
  );
}
