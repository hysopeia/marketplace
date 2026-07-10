import LegalPageLayout from "@/components/LegalPageLayout";

export default async function MentionsLegalesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <LegalPageLayout locale={locale} titre="Mentions legales">
      <p>
        <strong>Editeur du site</strong>
        <br />
        AfriTable est edite par [NOM DE L'ENTREPRISE / STATUT JURIDIQUE A COMPLETER],
        immatricule sous le numero [NUMERO RCCM A COMPLETER], dont le siege social
        est situe a [ADRESSE A COMPLETER], Abidjan, Cote d'Ivoire.
      </p>
      <p>
        <strong>Directeur de la publication</strong>
        <br />
        [NOM DU RESPONSABLE A COMPLETER]
      </p>
      <p>
        <strong>Contact</strong>
        <br />
        Telephone : +225 01 72 43 45 17
        <br />
        WhatsApp : +225 01 72 43 45 17
      </p>
      <p>
        <strong>Hebergement</strong>
        <br />
        Ce site est heberge par Netlify, Inc. La base de donnees est hebergee par
        Supabase Inc.
      </p>
      <p>
        <strong>Propriete intellectuelle</strong>
        <br />
        L'ensemble des elements presents sur ce site (textes, logo, mise en page,
        base de donnees) sont la propriete d'AfriTable, sauf mention contraire, et
        ne peuvent etre reproduits sans autorisation prealable.
      </p>
      <p style={{ fontSize: 13, color: "#6B7280", marginTop: 32, fontStyle: "italic" }}>
        Ce document est un modele de base fourni a titre indicatif et n'a pas ete
        relu par un professionnel du droit. Il est recommande de le faire verifier
        avant toute utilisation commerciale reelle.
      </p>
    </LegalPageLayout>
  );
}
