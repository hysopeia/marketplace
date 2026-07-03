import type { PaymentProvider } from "./provider.interface";
import { cinetpayProvider } from "./providers/cinetpay";

/**
 * Résolution du provider de paiement selon le pays du restaurant.
 * Voir section 6 du prompt maître — ne jamais coder un provider en dur
 * ailleurs dans l'application.
 *
 * Phase 1 (MVP CI) : uniquement CinetPay.
 * Phase 3+ : ajouter les adaptateurs Paystack/Flutterwave ici pour
 * le Nigeria/Ghana, sans toucher au reste de l'app.
 */
const ZONE_UEMOA_CEMAC = [
  "CI", "SN", "ML", "BF", "NE", "TG", "BJ", "GW", // UEMOA
  "CM", "GA", "CG", "TD", "GQ", "CF", // CEMAC
];

export function getProviderForCountry(pays: string): PaymentProvider {
  if (ZONE_UEMOA_CEMAC.includes(pays)) {
    return cinetpayProvider;
  }

  // TODO Phase 3 : brancher Paystack/Flutterwave pour NG, GH, KE...
  throw new Error(
    `Aucun provider de paiement configuré pour le pays "${pays}". ` +
      `Ajouter l'adaptateur correspondant dans src/lib/payments/providers/.`
  );
}
