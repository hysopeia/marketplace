"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Download } from "lucide-react";

type Props = {
  restaurantId: string;
  slug: string;
  pays: string;
  locale: string;
  logoUrl?: string | null;
};

export default function QrCommunication({ slug, pays, locale, logoUrl }: Props) {
  const t = useTranslations();
  const conteneurRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<any>(null);
  const [pret, setPret] = useState(false);

  const urlPublique =
    typeof window !== "undefined"
      ? `${window.location.origin}/${locale}/${pays}/${slug}`
      : "";

  useEffect(() => {
    if (!conteneurRef.current || !urlPublique) return;

    // Import dynamique : qr-code-styling utilise Canvas, uniquement cote navigateur
    import("qr-code-styling").then(({ default: QRCodeStyling }) => {
      const qr = new QRCodeStyling({
        width: 300,
        height: 300,
        data: urlPublique,
        image: logoUrl || "/images/logo-afritable.png",
        dotsOptions: { color: "#F3EFE4", type: "rounded" },
        cornersSquareOptions: { color: "#F59E0B", type: "extra-rounded" },
        cornersDotOptions: { color: "#0F8B4C" },
        backgroundOptions: { color: "#0F3320" },
        imageOptions: { crossOrigin: "anonymous", margin: 8, imageSize: 0.35 },
        qrOptions: { errorCorrectionLevel: "H" },
      });

      if (conteneurRef.current) {
        conteneurRef.current.innerHTML = "";
        qr.append(conteneurRef.current);
      }
      qrRef.current = qr;
      setPret(true);
    });
  }, [urlPublique, logoUrl]);

  function telecharger() {
    qrRef.current?.download({ name: `qr-${slug}`, extension: "png" });
  }

  return (
    <div style={{
      background: "#0F3320", borderRadius: 16, padding: 24,
      boxShadow: "0 2px 8px rgba(38,34,28,0.06)", maxWidth: 420,
    }}>
      <h3 style={{ fontFamily: "Georgia, serif", fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
        {t("qr_com_titre")}
      </h3>
      <p style={{ fontSize: 13, color: "#9BB5A5", marginBottom: 16 }}>
        {t("qr_com_description")}
      </p>

      <div ref={conteneurRef} style={{
        display: "flex", justifyContent: "center", padding: 16,
        background: "#0B2818", borderRadius: 12, marginBottom: 16,
        minHeight: 300, alignItems: "center",
      }} />

      <p style={{ fontSize: 12, color: "#9BB5A5", marginBottom: 16, wordBreak: "break-all" }}>
        {urlPublique}
      </p>

      <button
        onClick={telecharger}
        disabled={!pret}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
          background: pret ? "#F59E0B" : "#1D4A31", color: "#F3EFE4",
          fontWeight: 600, fontSize: 14, cursor: pret ? "pointer" : "default",
          fontFamily: "inherit",
        }}
      >
        <Download size={16} />
        {t("qr_com_telecharger")}
      </button>
    </div>
  );
}
