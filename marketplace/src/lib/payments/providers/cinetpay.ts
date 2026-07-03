import type {
  PaymentProvider,
  InitierPaiementParams,
  InitierPaiementResult,
  StatutPaiement,
} from "../provider.interface";

/**
 * Adaptateur CinetPay — provider par défaut pour la zone UEMOA/CEMAC
 * (Wave, Orange Money, MTN Money, cartes). Voir section 6 du prompt maître.
 *
 * Documentation officielle CinetPay à consulter pour les noms de champs
 * exacts de leur API avant mise en production (ce squelette pose la structure,
 * pas les détails d'implémentation finaux).
 */
export const cinetpayProvider: PaymentProvider = {
  nom: "cinetpay",

  async initierPaiement(
    params: InitierPaiementParams
  ): Promise<InitierPaiementResult> {
    const response = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: process.env.CINETPAY_API_KEY,
        site_id: process.env.CINETPAY_SITE_ID,
        transaction_id: params.reference,
        amount: params.montant,
        currency: params.devise,
        notify_url: params.callbackUrl,
        return_url: params.callbackUrl,
        channels: "ALL",
      }),
    });

    const data = await response.json();

    return {
      paymentUrl: data.data.payment_url,
      transactionId: params.reference,
    };
  },

  async verifierPaiement(transactionId: string): Promise<StatutPaiement> {
    const response = await fetch(
      "https://api-checkout.cinetpay.com/v2/payment/check",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apikey: process.env.CINETPAY_API_KEY,
          site_id: process.env.CINETPAY_SITE_ID,
          transaction_id: transactionId,
        }),
      }
    );

    const data = await response.json();

    if (data.data?.status === "ACCEPTED") return "reussi";
    if (data.data?.status === "REFUSED") return "echoue";
    return "en_attente";
  },
};
