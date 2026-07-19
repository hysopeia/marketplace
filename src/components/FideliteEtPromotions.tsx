"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, Eye, EyeOff, Gift } from "lucide-react";

type ConfigFidelite = {
  actif: boolean;
  points_par_fcfa: number;
  seuil_recompense: number;
  description_recompense: string;
};

type Promotion = { id: string; texte: string; actif: boolean; created_at: string };

export default function FideliteEtPromotions({ restaurantId }: { restaurantId: string }) {
  const t = useTranslations();
  const [config, setConfig] = useState<ConfigFidelite>({
    actif: false,
    points_par_fcfa: 0.01,
    seuil_recompense: 100,
    description_recompense: "",
  });
  const [chargement, setChargement] = useState(true);
  const [sauvegardeEnCours, setSauvegardeEnCours] = useState(false);
  const [messageSucces, setMessageSucces] = useState(false);

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [nouvellePromo, setNouvellePromo] = useState("");

  const charger = useCallback(async () => {
    try {
      const [resFidelite, resPromos] = await Promise.all([
        fetch(`/api/fidelite?restaurantId=${restaurantId}`),
        fetch(`/api/promotions?restaurantId=${restaurantId}&toutes=true`),
      ]);
      if (resFidelite.ok) {
        const data = await resFidelite.json();
        if (data.config) setConfig(data.config);
      }
      if (resPromos.ok) {
        const data = await resPromos.json();
        setPromotions(data.promotions || []);
      }
    } catch {
      // Echec silencieux
    }
    setChargement(false);
  }, [restaurantId]);

  useEffect(() => {
    charger();
  }, [charger]);

  async function sauvegarderConfig() {
    setSauvegardeEnCours(true);
    setMessageSucces(false);
    const res = await fetch("/api/fidelite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantId,
        action: "config",
        pointsParFcfa: config.points_par_fcfa,
        seuilRecompense: config.seuil_recompense,
        descriptionRecompense: config.description_recompense,
        actif: config.actif,
      }),
    });
    if (res.ok) setMessageSucces(true);
    setSauvegardeEnCours(false);
  }

  async function ajouterPromotion() {
    if (!nouvellePromo.trim()) return;
    const res = await fetch("/api/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId, texte: nouvellePromo }),
    });
    if (res.ok) {
      setNouvellePromo("");
      charger();
    }
  }

  async function toggleActifPromo(promo: Promotion) {
    await fetch("/api/promotions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: promo.id, restaurantId, actif: !promo.actif }),
    });
    charger();
  }

  async function supprimerPromo(id: string) {
    if (!confirm(t("promo_confirmer_suppression"))) return;
    await fetch(`/api/promotions?id=${id}&restaurantId=${restaurantId}`, { method: "DELETE" });
    charger();
  }

  if (chargement) {
    return <p style={{ fontSize: 13, color: "#6B7280" }}>{t("chargement")}</p>;
  }

  const cardStyle: React.CSSProperties = {
    background: "#FFFFFF", borderRadius: 16, padding: 24,
    boxShadow: "0 2px 8px rgba(38,34,28,0.06)", marginBottom: 20,
  };

  return (
    <div style={{ maxWidth: 560 }}>
      {/* Programme de fidelite */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Gift size={18} color="#F59E0B" />
            <h3 style={{ fontFamily: "Georgia, serif", fontSize: 17, fontWeight: 700, margin: 0 }}>
              {t("fidelite_titre")}
            </h3>
          </div>
          <button
            onClick={() => setConfig({ ...config, actif: !config.actif })}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
              borderRadius: 20, border: "none", cursor: "pointer", fontFamily: "inherit",
              background: config.actif ? "#E5E7EB" : "#123B26",
              color: config.actif ? "#97C459" : "#6B7280", fontSize: 12, fontWeight: 600,
            }}
          >
            {config.actif ? <Eye size={13} /> : <EyeOff size={13} />}
            {config.actif ? t("fidelite_actif") : t("fidelite_inactif")}
          </button>
        </div>

        <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>
          {t("fidelite_description")}
        </p>

        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          {t("fidelite_taux_label")}
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: "#6B7280" }}>1 {t("fidelite_point")} {t("fidelite_pour_chaque")}</span>
          <input
            type="number"
            value={config.points_par_fcfa > 0 ? Math.round(1 / config.points_par_fcfa) : 100}
            onChange={(e) => {
              const fcfaParPoint = Number(e.target.value) || 1;
              setConfig({ ...config, points_par_fcfa: 1 / fcfaParPoint });
            }}
            style={{
              width: 90, padding: "8px 10px", border: "1px solid #E5E7EB",
              borderRadius: 8, fontSize: 13, boxSizing: "border-box",
            }}
          />
          <span style={{ fontSize: 13, color: "#6B7280" }}>FCFA {t("fidelite_depenses")}</span>
        </div>

        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          {t("fidelite_seuil_label")}
        </label>
        <input
          type="number"
          value={config.seuil_recompense}
          onChange={(e) => setConfig({ ...config, seuil_recompense: Number(e.target.value) || 0 })}
          style={{
            width: "100%", padding: "9px 12px", border: "1px solid #E5E7EB",
            borderRadius: 8, fontSize: 13, marginBottom: 16, boxSizing: "border-box",
          }}
        />

        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          {t("fidelite_recompense_label")}
        </label>
        <input
          type="text"
          value={config.description_recompense}
          onChange={(e) => setConfig({ ...config, description_recompense: e.target.value })}
          placeholder={t("fidelite_recompense_placeholder")}
          style={{
            width: "100%", padding: "9px 12px", border: "1px solid #E5E7EB",
            borderRadius: 8, fontSize: 13, marginBottom: 16, boxSizing: "border-box",
          }}
        />

        {messageSucces && (
          <p style={{ fontSize: 12, color: "#97C459", marginBottom: 10 }}>{t("fidelite_sauvegarde")}</p>
        )}

        <button
          onClick={sauvegarderConfig}
          disabled={sauvegardeEnCours}
          style={{
            padding: "10px 20px", borderRadius: 10, border: "none",
            background: "#F59E0B", color: "#1F2937", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          {sauvegardeEnCours ? t("chargement") : t("fidelite_enregistrer")}
        </button>
      </div>

      {/* Promotions */}
      <div style={cardStyle}>
        <h3 style={{ fontFamily: "Georgia, serif", fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
          {t("promo_titre")}
        </h3>
        <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>
          {t("promo_description")}
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            value={nouvellePromo}
            onChange={(e) => setNouvellePromo(e.target.value)}
            placeholder={t("promo_placeholder")}
            style={{
              flex: 1, padding: "9px 12px", border: "1px solid #E5E7EB",
              borderRadius: 8, fontSize: 13, boxSizing: "border-box",
            }}
          />
          <button
            onClick={ajouterPromotion}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "9px 16px",
              borderRadius: 8, border: "none", background: "#F59E0B", color: "#1F2937",
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <Plus size={14} />
            {t("promo_ajouter")}
          </button>
        </div>

        {promotions.length === 0 ? (
          <p style={{ fontSize: 13, color: "#6B7280" }}>{t("promo_vide")}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {promotions.map((promo) => (
              <div key={promo.id} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                borderRadius: 10, background: "#F4F6F8", opacity: promo.actif ? 1 : 0.5,
              }}>
                <span style={{ flex: 1, fontSize: 13 }}>{promo.texte}</span>
                <button
                  onClick={() => toggleActifPromo(promo)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", padding: 4 }}
                >
                  {promo.actif ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button
                  onClick={() => supprimerPromo(promo.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#F09595", padding: 4 }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
