import LegalPageLayout from "@/components/LegalPageLayout";

export default async function ConfidentialitePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <LegalPageLayout locale={locale} titre="Politique de confidentialite">
      <p>
        <strong>Donnees collectees</strong>
        <br />
        Lors d'une reservation ou d'une commande, AfriTable collecte le nom et le
        numero de telephone du client, ainsi que, le cas echeant, l'adresse de
        livraison qu'il communique. Pour les restaurants, un compte email et un
        mot de passe sont necessaires a la connexion.
      </p>
      <p>
        <strong>Utilisation des donnees</strong>
        <br />
        Ces informations sont utilisees uniquement pour permettre au restaurant de
        traiter la reservation ou la commande, et pour le programme de fidelite
        lorsque le client y adhere volontairement. Elles ne sont ni vendues, ni
        partagees a des fins commerciales avec des tiers.
      </p>
      <p>
        <strong>Conservation</strong>
        <br />
        Les donnees sont conservees le temps necessaire a la relation entre le
        client et le restaurant concerne.
      </p>
      <p>
        <strong>Hebergement</strong>
        <br />
        Les donnees sont hebergees par Supabase Inc., avec des mesures de securite
        standard (acces restreint, chiffrement des connexions).
      </p>
      <p>
        <strong>Droits des utilisateurs</strong>
        <br />
        Toute personne peut demander la consultation ou la suppression de ses
        donnees en contactant AfriTable via les coordonnees indiquees en pied de
        page.
      </p>
      <p style={{ fontSize: 13, color: "#6B7280", marginTop: 32, fontStyle: "italic" }}>
        Ce document est un modele de base fourni a titre indicatif et n'a pas ete
        relu par un professionnel du droit. Il est recommande de le faire verifier
        avant toute utilisation commerciale reelle.
      </p>
    </LegalPageLayout>
  );
}
