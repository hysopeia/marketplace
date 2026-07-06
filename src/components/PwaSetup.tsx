"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, X } from "lucide-react";

export default function PwaSetup() {
  const t = useTranslations();
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Enregistrement du service worker (fonctionnement hors-ligne basique)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Echec silencieux — la PWA reste utilisable normalement,
        // juste sans les benefices hors-ligne.
      });
    }

    // Detection iOS : ne supporte pas beforeinstallprompt, on affiche
    // des instructions manuelles a la place ("Partager > Sur l'ecran
    // d'accueil").
    const ua = window.navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const dejaInstalle = window.matchMedia("(display-mode: standalone)").matches;
    const dejaVu = localStorage.getItem("pwa_prompt_dismissed");

    if (dejaInstalle || dejaVu) return;

    if (iOS) {
      setIsIos(true);
      setShowBanner(true);
      return;
    }

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setInstallPrompt(e);
      setShowBanner(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  function handleInstall() {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.finally(() => {
      setShowBanner(false);
      setInstallPrompt(null);
    });
  }

  function handleDismiss() {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem("pwa_prompt_dismissed", "1");
  }

  if (!showBanner || dismissed) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: 16,
        right: 16,
        maxWidth: 420,
        margin: "0 auto",
        background: "#1F2937",
        color: "white",
        borderRadius: 14,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        zIndex: 999,
        boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "#F59E0B",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontWeight: 700,
        }}
      >
        R
      </div>
      <div style={{ flex: 1, fontSize: 13, lineHeight: 1.4 }}>
        {isIos ? t("pwa_ios_instructions") : t("pwa_invite")}
      </div>
      {!isIos && (
        <button
          onClick={handleInstall}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 8,
            border: "none",
            background: "#0F8B4C",
            color: "#412402",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
            whiteSpace: "nowrap",
            fontFamily: "inherit",
          }}
        >
          <Download size={14} />
          {t("pwa_installer")}
        </button>
      )}
      <button
        onClick={handleDismiss}
        aria-label="Fermer"
        style={{
          background: "none",
          border: "none",
          color: "rgba(255,255,255,0.6)",
          cursor: "pointer",
          padding: 4,
          flexShrink: 0,
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
