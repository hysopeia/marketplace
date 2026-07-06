import QRCode from "qrcode";

/**
 * Generation de QR code auto-heberge.
 * Niveau de correction H (30%) obligatoire pour tolerer un logo.
 * Le QR encode uniquement une URL stable interne.
 */
interface GenererQrCodeParams {
  url: string;
  logoUrl?: string;
  taille?: number;
}

export async function genererQrCode({
  url,
  taille = 300,
}: GenererQrCodeParams): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    width: taille,
    margin: 2,
    color: {
      dark: "#F59E0B",
      light: "#FFFFFF",
    },
    errorCorrectionLevel: "H",
  });
}