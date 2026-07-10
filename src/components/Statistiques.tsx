"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type StatsData = {
  periode: number;
  revenuActuel: number;
  evolutionRevenu: number | null;
  nombreCommandes: number;
  panierMoyen: number;
  evolutionJournaliere: { date: string; revenu: number; commandes: number }[];
  parType: Record<string, number>;
  topPlats: { nom: string; quantite: number; revenu: number }[];
  totalReservations: number;
  tauxNoShow: number;
  moyenneCouverts: number;
  paiementsParMode: Record<string, number>;
  satisfaction: number | null;
  totalAvis: number;
};

function EvolutionBadge({ valeur }: { valeur: number | null }) {
  if (valeur === null) return null;
  const positif = valeur > 0;
  const neutre = valeur === 0;
  const couleur = neutre ? "#9BB5A5" : positif ? "#97C459" : "#F09595";
  const bg = neutre ? "#123B26" : positif ? "#1D4A31" : "#501313";
  const Icone = neutre ? Minus : positif ? TrendingUp : TrendingDown;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700,
      color: couleur, background: bg,
    }}>
      <Icone size={11} />
      {positif ? "+" : ""}{valeur}%
    </span>
  );
}

function MiniLineChart({ data }: { data: { date: string; revenu: number }[] }) {
  if (data.length === 0) {
    return <p style={{ fontSize: 13, color: "#9BB5A5" }}>Pas encore de donnees.</p>;
  }
  const largeur = 640;
  const hauteur = 120;
  const maxVal = Math.max(...data.map((d) => d.revenu), 1);
  const step = data.length > 1 ? largeur / (data.length - 1) : 0;
  const points = data
    .map((d, i) => `${i * step},${hauteur - (d.revenu / maxVal) * (hauteur - 10)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${largeur} ${hauteur}`} style={{ width: "100%", height: 140 }} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="#F59E0B" strokeWidth={2.5} />
      {data.map((d, i) => (
        <circle key={i} cx={i * step} cy={hauteur - (d.revenu / maxVal) * (hauteur - 10)} r={3} fill="#F59E0B" />
      ))}
    </svg>
  );
}

export default function Statistiques({ restaurantId }: { restaurantId: string }) {
  const t = useTranslations();
  const [periode, setPeriode] = useState(30);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await fetch(`/api/stats?restaurantId=${restaurantId}&periode=${periode}`);
      if (res.ok) setStats(await res.json());
    } catch {
      // Echec silencieux
    }
    setChargement(false);
  }, [restaurantId, periode]);

  useEffect(() => {
    charger();
  }, [charger]);

  if (chargement || !stats) {
    return <p style={{ fontSize: 13, color: "#9BB5A5" }}>{t("chargement")}</p>;
  }

  const cardStyle: React.CSSProperties = {
    background: "#0F3320", borderRadius: 16, padding: "18px 20px",
    boxShadow: "0 2px 8px rgba(31,41,55,0.06)",
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[7, 30, 90].map((p) => (
          <button
            key={p}
            onClick={() => setPeriode(p)}
            style={{
              padding: "6px 16px", borderRadius: 20, border: "1px solid #1D4A31",
              background: periode === p ? "#F59E0B" : "#0F3320",
              color: periode === p ? "white" : "#9BB5A5",
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {p} {t("stats_jours")}
          </button>
        ))}
      </div>

      {/* Cartes chiffres cles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))", gap: 12, marginBottom: 20 }}>
        <div style={cardStyle}>
          <p style={{ fontSize: 12, color: "#9BB5A5", marginBottom: 6 }}>{t("stats_revenu_total")}</p>
          <p style={{ fontSize: 20, fontWeight: 800, fontFamily: "system-ui, sans-serif", marginBottom: 4 }}>
            {stats.revenuActuel.toLocaleString()} FCFA
          </p>
          <EvolutionBadge valeur={stats.evolutionRevenu} />
        </div>
        <div style={cardStyle}>
          <p style={{ fontSize: 12, color: "#9BB5A5", marginBottom: 6 }}>{t("stats_nb_commandes")}</p>
          <p style={{ fontSize: 20, fontWeight: 800, fontFamily: "system-ui, sans-serif" }}>{stats.nombreCommandes}</p>
        </div>
        <div style={cardStyle}>
          <p style={{ fontSize: 12, color: "#9BB5A5", marginBottom: 6 }}>{t("stats_panier_moyen")}</p>
          <p style={{ fontSize: 20, fontWeight: 800, fontFamily: "system-ui, sans-serif" }}>{stats.panierMoyen.toLocaleString()} FCFA</p>
        </div>
        <div style={cardStyle}>
          <p style={{ fontSize: 12, color: "#9BB5A5", marginBottom: 6 }}>{t("stats_satisfaction")}</p>
          <p style={{ fontSize: 20, fontWeight: 800, fontFamily: "system-ui, sans-serif" }}>
            {stats.satisfaction != null ? `${stats.satisfaction}%` : "—"}
          </p>
        </div>
      </div>

      {/* Courbe de revenu */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{t("stats_evolution_revenu")}</p>
        <MiniLineChart data={stats.evolutionJournaliere} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Top plats */}
        <div style={cardStyle}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{t("stats_top_plats")}</p>
          {stats.topPlats.length === 0 ? (
            <p style={{ fontSize: 13, color: "#9BB5A5" }}>{t("stats_aucune_donnee")}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stats.topPlats.map((p, i) => {
                const maxQte = stats.topPlats[0].quantite;
                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                      <span>{p.nom}</span>
                      <span style={{ fontWeight: 700 }}>{p.quantite}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 4, background: "#123B26", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 4, background: "#F59E0B",
                        width: `${(p.quantite / maxQte) * 100}%`,
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reservations */}
        <div style={cardStyle}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{t("stats_reservations_titre")}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "#9BB5A5" }}>{t("stats_total_reservations")}</span>
              <strong>{stats.totalReservations}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "#9BB5A5" }}>{t("stats_taux_no_show")}</span>
              <strong style={{ color: stats.tauxNoShow > 15 ? "#F09595" : "#F3EFE4" }}>{stats.tauxNoShow}%</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "#9BB5A5" }}>{t("stats_moyenne_couverts")}</span>
              <strong>{stats.moyenneCouverts}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
