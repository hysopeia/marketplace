import QRCodeStyling from "qr-code-styling";

/**
 * Génération de QR code auto-hébergée avec logo intégré.
 * Voir section 8 du prompt maître.
 *
 * - Niveau de correction d'erreur H (30%) obligatoire pour tolérer le logo.
 * - Le QR encode uniquement une URL stable interne (reservdine.app/r/{id}
 *   ou /c/{id}) — le contenu change côté base de données, jamais côté QR.
 * - Aucune dépendance à un service SaaS tiers de génération de QR.
 */
interface GenererQrCodeParams {
  url: string; // ex: https://reservdine.app/r/{reservation_id}
  logoUrl?: string; // restaurants.logo_url
  taille?: number;
}

export async function genererQrCode({
  url,
  logoUrl,
  taille = 300,
}: GenererQrCodeParams): Promise<Buffer> {
  const qrCode = new QRCodeStyling({
    width: taille,
    height: taille,
    data: url,
    image: logoUrl,
    dotsOptions: {
      color: "#0B5D3B",
      type: "rounded",
    },
    backgroundOptions: {
      color: "#FFFFFF",
    },
    imageOptions: {
      crossOrigin: "anonymous",
      margin: 8,
    },
    qrOptions: {
      errorCorrectionLevel: "H",
    },
  });

  const blob = await qrCode.getRawData("png");
  const arrayBuffer = await (blob as Blob).arrayBuffer();
  return Buffer.from(arrayBuffer);
}
