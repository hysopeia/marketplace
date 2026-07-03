/**
 * Interface unique de paiement — AUCUN SDK de paiement ne doit être appelé
 * directement depuis les composants ou API routes. Toujours passer par
 * getProviderForCountry() + cette interface.
 */
export interface InitierPaiementParams {
  montant: number;
  devise: string;
  pays: string; // code ISO, ex: 'CI', 'SN', 'GH'
  reference: string; // reservation_id ou commande_id
  callbackUrl: string;
}

export interface InitierPaiementResult {
  paymentUrl: string;
  transactionId: string;
}

export type StatutPaiement = "reussi" | "echoue" | "en_attente";

export interface PaymentProvider {
  nom: string;
  initierPaiement(params: InitierPaiementParams): Promise<InitierPaiementResult>;
  verifierPaiement(transactionId: string): Promise<StatutPaiement>;
}
