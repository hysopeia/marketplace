import type {
  PaymentProvider,
  InitierPaiementParams,
  InitierPaiementResult,
  StatutPaiement,
} from "../provider.interface";

/**
 * Adaptateur ElyonPay — choix ALTERNATIF a CinetPay, pas un remplacement.
 * Reference publique : https://elyonpay.com/api.html
 *
 * ATTENTION — points a verifier une fois une vraie cle API disponible :
 * 1. URL de base exacte (ELYONPAY_BASE_URL ci-dessous est une supposition
 *    raisonnable, non confirmee — verifier sur docs.elyonpay.com/fr/).
 * 2. Contrairement a CinetPay (qui renvoie un lien de paiement a scanner
 *    en QR), l'exemple public d'ElyonPay prend un NUMERO DE TELEPHONE en
 *    parametre et pousse directement une notification de paiement — donc
 *    potentiellement pas de "payment_url" a transformer en QR. A confirmer
 *    avec la vraie documentation avant mise en production reelle.
 * 3. Noms de champs de reponse (status/id) bases sur l'exemple marketing
 *    public, pas sur une reponse API reelle observee.
 */

const ELYONPAY_BASE_URL =
  process.env.ELYONPAY_BASE_URL || "https://api.elyonpay.com/v1";

// Table de correspondance methode de paiement -> code operateur ElyonPay
const METHODES_PAR_PAYS: Record<string, string> = {
  orange: "orange_money",
  mtn: "mtn_mobile_money",
  moov: "moov_money",
  wave: "wave",
};

export const elyonpayProvider: PaymentProvider = {
  nom: "elyonpay",

  async initierPaiement(
    params: InitierPaiementParams & { telephone?: string; methode?: string }
  ): Promise<InitierPaiementResult> {
    if (!params.telephone) {
      throw new Error(
        "ElyonPay necessite le numero de telephone du client (contrairement a CinetPay qui utilise un lien de paiement)."
      );
    }

    const response = await fetch(`${ELYONPAY_BASE_URL}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ELYONPAY_API_KEY}`,
      },
      body: JSON.stringify({
        amount: params.montant,
        currency: params.devise,
        method: METHODES_PAR_PAYS[params.methode || "orange"] || "orange_money",
        phone: params.telephone,
        description: `Reference ${params.reference}`,
        callback_url: params.callbackUrl,
      }),
    });

    if (!response.ok) {
      const erreurTexte = await response.text();
      throw new Error(`Erreur ElyonPay (${response.status}): ${erreurTexte}`);
    }

    const data = await response.json();

    return {
      // Pas de payment_url documente publiquement pour l'instant — le
      // transactionId est ce qui permet de suivre le statut ensuite.
      paymentUrl: data.payment_url || "",
      transactionId: data.id,
    };
  },

  async verifierPaiement(transactionId: string): Promise<StatutPaiement> {
    const response = await fetch(
      `${ELYONPAY_BASE_URL}/payments/${transactionId}`,
      {
        headers: { Authorization: `Bearer ${process.env.ELYONPAY_API_KEY}` },
      }
    );

    if (!response.ok) return "en_attente";

    const data = await response.json();

    if (data.status === "completed" || data.status === "success") return "reussi";
    if (data.status === "failed" || data.status === "cancelled") return "echoue";
    return "en_attente";
  },
};
