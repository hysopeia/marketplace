import { defineRouting } from "next-intl/routing";

/**
 * Langues supportées dès le MVP — voir section 3 du prompt maître.
 * FR = Côte d'Ivoire, Sénégal, Mali, Cameroun, RDC...
 * EN = Ghana, Nigeria, Kenya...
 * PT = Angola, Mozambique, Guinée-Bissau, Cap-Vert
 * ES = Guinée équatoriale, diaspora hispanophone
 */
export const routing = defineRouting({
  locales: ["fr", "en", "es", "pt"],
  defaultLocale: "fr",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
