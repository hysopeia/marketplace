"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Gift, Share2, Check } from "lucide-react";

type Props = {
  restaurantId: string;
  restaurantNom: string;
};

export default function EngagementClient({ restaurantId, restaurantNom }: Props) {
  const t = useTranslations();
  const [configFidelite, setConfigFidelite] = useState<{
    actif: boolean;
    points_par_fcfa: number;
    seuil_recompense: number;
    description_recompense: string;
  } | null>(null);

  const [telephone, setTelephone] = useState("");
  const [consultation, setConsultation] = useState<{ inscrit: boolean; points: number } | null>(null);
  const [chargementFidelite, setChargementFidelite] = useState(false);
  const [messageFidelite, setMessageFidelite] = useState("");
  const [partageConfirme, setPartageConfirme] = useState(false);

  useEffect(() => {
    fetch(`/api/fidelite?restaurantId=${restaurantId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.config && setConfigFidelite(data.config))
      .catch(() => {});
  }, [restaurantId]);

  async function consulterOuRejoindre(rejoindre: boolean) {
    if (!telephone) {
      setMessageFidelite(t("champs_requis"));
      return;
    }
    setChargementFidelite(true);
    setMessageFidelite("");

    if (rejoindre) {
      const res = await fetch("/api/fidelite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, action: "rejoindre", telephone }),
      });
      if (!res.ok) {
        setMessageFidelite(t("erreur_generique"));
        setChargementFidelite(false);
        return;
      }
    }

    const res = await fetch(`/api/fidelite?restaurantId=${restaurantId}&telephone=${encodeURIComponent(telephone)}`);
    if (res.ok) {
      const data = await res.json();
      setConsultation({ inscrit: data.inscrit, points: data.points ?? 0 });
    }
    setChargementFidelite(false);
  }

  function partager() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator.share({ title: restaurantNom, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      setPartageConfirme(true);
      setTimeout(() => setPartageConfirme(false), 2000);
    }
  }

  const aucunContenu = !configFidelite?.actif;
  if (aucunContenu) {
    // On garde quand meme le bouton de partage, toujours utile
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 24px" }}>
        <button
          onClick={partager}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
            borderRadius: 10, border: "2px solid #E5E1D8", background: "white",
            color: "#6B7280", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          {partageConfirme ? <Check size={15} color="#3B6D11" /> : <Share2 size={15} />}
          {partageConfirme ? t("partage_copie") : t("partage_bouton")}
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 24px" }}>
      {configFidelite?.actif && (
        <div style={{
          background: "white", borderRadius: 16, padding: 20,
          boxShadow: "0 2px 8px rgba(38,34,28,0.06)", marginBottom: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Gift size={18} color="#F59E0B" />
            <h3 style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700, margin: 0 }}>
              {t("fidelite_titre")}
            </h3>
          </div>
          <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 14 }}>
            {t("fidelite_client_pitch", {
              seuil: configFidelite.seuil_recompense,
              recompense: configFidelite.description_recompense,
            })}
          </p>

          {consultation ? (
            <div style={{ padding: "12px 16px", borderRadius: 10, background: "#EAF3DE", fontSize: 14 }}>
              <strong style={{ color: "#3B6D11" }}>{consultation.points} {t("fidelite_point")}(s)</strong>
              {" — "}
              {consultation.points >= configFidelite.seuil_recompense
                ? t("fidelite_recompense_atteinte")
                : t("fidelite_points_manquants", { manque: configFidelite.seuil_recompense - consultation.points })}
            </div>
          ) : (
            <>
              {messageFidelite && (
                <p style={{ fontSize: 12, color: "#B91C1C", marginBottom: 8 }}>{messageFidelite}</p>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder={t("fidelite_votre_telephone")}
                  style={{
                    flex: "1 1 180px", padding: "9px 12px", border: "1px solid #E5E1D8",
                    borderRadius: 8, fontSize: 13, boxSizing: "border-box",
                  }}
                />
                <button
                  onClick={() => consulterOuRejoindre(false)}
                  disabled={chargementFidelite}
                  style={{
                    padding: "9px 14px", borderRadius: 8, border: "1px solid #E5E1D8",
                    background: "white", color: "#6B7280", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {t("fidelite_consulter")}
                </button>
                <button
                  onClick={() => consulterOuRejoindre(true)}
                  disabled={chargementFidelite}
                  style={{
                    padding: "9px 14px", borderRadius: 8, border: "none",
                    background: "#F59E0B", color: "white", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {t("fidelite_rejoindre")}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <button
        onClick={partager}
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
          borderRadius: 10, border: "2px solid #E5E1D8", background: "white",
          color: "#6B7280", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        }}
      >
        {partageConfirme ? <Check size={15} color="#3B6D11" /> : <Share2 size={15} />}
        {partageConfirme ? t("partage_copie") : t("partage_bouton")}
      </button>
    </div>
  );
}
