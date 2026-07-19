"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { TrendingUp, TrendingDown, Minus, Wallet, ShoppingBag, UtensilsCrossed, Star } from "lucide-react";

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

const COULEURS_TYPE: Record<string, string> = {
  sur_place: "#F59E0B",
  retrait: "#3B82F6",
  livraison: "#A855F7",
};

const LABELS_TYPE: Record<string, string> = {
  sur_place: "Sur place",
  retrait: "A retirer",
  livraison: "Livraison",
};

const STYLE_CARTE: React.CSSProperties = {
  background: "#0F3320", borderRadius: 14, padding: 16,
  boxShadow: "0 2px 8px rgba(31,41,55,0.06)",
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

function pointsSparkline(valeurs: number[], largeur: number, hauteur: number): string {
  if (valeurs.length === 0) return "";
  const maxVal = Math.max(...valeurs, 1);
  const step = valeurs.length > 1 ? largeur / (valeurs.length - 1) : 0;
  return valeurs.map((v, i) => `${(i * step).toFixed(1)},${(hauteur - (v / maxVal) * hauteur).toFixed(1)}`).join(" ");
}

function KpiCard({
  icon: Icon,
  iconBg,
  label,
  valeur,
  evolution,
  sparkline,
  sparklineCouleur,
}: {
  icon: React.ElementType;
  iconBg: string;
  label: string;
  valeur: string | number;
  evolution?: number | null;
  sparkline?: number[];
  sparklineCouleur?: string;
}) {
  return (
    <div style={{ padding: 14, borderRadius: 12, background: "#0F3320", boxShadow: "0 2px 8px rgba(31,41,55,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 9, background: iconBg,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon size={14} color="white" />
        </div>
        <p style={{ fontSize: 12, color: "#9BB5A5", margin: 0 }}>{label}</p>
      </div>
      <p style={{ fontSize: 18, fontWeight: 800, fontFamily: "system-ui, sans-serif", margin: 0, color: "#F3EFE4" }}>
        {valeur}
      </p>
      {evolution !== undefined && (
        <div style={{ marginTop: 4 }}>
          <EvolutionBadge valeur={evolution} />
        </div>
      )}
      {sparkline && sparkline.length > 1 && (
        <svg viewBox="0 0 100 28" style={{ width: "100%", height: 28, marginTop: 8 }} preserveAspectRatio="none">
          <polyline points={pointsSparkline(sparkline, 100, 26)} fill="none" stroke={sparklineCouleur || "#F59E0B"} strokeWidth={2} />
        </svg>
      )}
    </div>
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

  const totalType = Object.values(stats.parType).reduce((s, n) => s + n, 0) || 1;
  let angleCumule = 0;
  const segmentsType = Object.entries(stats.parType).map(([type, count]) => {
    const part = count / totalType;
    const debut = angleCumule;
    angleCumule += part;
    return { type, count, debut, fin: angleCumule, part };
  });

  function pointCercle(fraction: number, rayon: number): [number, number] {
    const angle = fraction * 2 * Math.PI - Math.PI / 2;
    return [50 + rayon * Math.cos(angle), 50 + rayon * Math.sin(angle)];
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[7, 30, 90].map((p) => (
          <button
            key={p}
            onClick={() => setPeriode(p)}
            style={{
              padding: "5px 14px", borderRadius: 20, border: "1px solid #1D4A31",
              background: periode === p ? "#F59E0B" : "#0F3320",
              color: periode === p ? "white" : "#9BB5A5",
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {p} {t("stats_jours")}
          </button>
        ))}
      </div>

      {/* Cartes chiffres cles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))", gap: 10, marginBottom: 14 }}>
        <KpiCard
          icon={Wallet} iconBg="#F59E0B" label={t("stats_revenu_total")}
          valeur={`${stats.revenuActuel.toLocaleString()} FCFA`}
          evolution={stats.evolutionRevenu}
          sparkline={stats.evolutionJournaliere.map((d) => d.revenu)}
          sparklineCouleur="#F59E0B"
        />
        <KpiCard
          icon={ShoppingBag} iconBg="#3B82F6" label={t("stats_nb_commandes")}
          valeur={stats.nombreCommandes}
          sparkline={stats.evolutionJournaliere.map((d) => d.commandes)}
          sparklineCouleur="#3B82F6"
        />
        <KpiCard
          icon={UtensilsCrossed} iconBg="#0F8B4C" label={t("stats_panier_moyen")}
          valeur={`${stats.panierMoyen.toLocaleString()} FCFA`}
        />
        <KpiCard
          icon={Star} iconBg="#EAB308" label={t("stats_satisfaction")}
          valeur={stats.satisfaction != null ? `${stats.satisfaction}%` : "—"}
        />
      </div>

      {/* Courbe de revenu | Repartition par type */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1.4fr) minmax(220px, 1fr)", gap: 14, marginBottom: 14 }}>
        <div style={STYLE_CARTE}>
          <p style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 10, color: "#F3EFE4" }}>{t("stats_evolution_revenu")}</p>
          {stats.evolutionJournaliere.length > 0 ? (
            <svg viewBox="0 0 640 130" style={{ width: "100%", height: 140 }} preserveAspectRatio="none">
              {(() => {
                const data = stats.evolutionJournaliere;
                const maxVal = Math.max(...data.map((d) => d.revenu), 1);
                const step = data.length > 1 ? 640 / (data.length - 1) : 0;
                const points = data.map((d, i) => [i * step, 120 - (d.revenu / maxVal) * 110]);
                const ligne = points.map((p) => p.join(",")).join(" ");
                const aire = `0,120 ${ligne} ${(data.length - 1) * step},120`;
                return (
                  <>
                    <polygon points={aire} fill="url(#degradeStatsCA)" />
                    <polyline points={ligne} fill="none" stroke="#F59E0B" strokeWidth={2.5} />
                    <defs>
                      <linearGradient id="degradeStatsCA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </>
                );
              })()}
            </svg>
          ) : (
            <p style={{ fontSize: 13, color: "#9BB5A5" }}>{t("stats_aucune_donnee")}</p>
          )}
        </div>

        <div style={STYLE_CARTE}>
          <p style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 10, color: "#F3EFE4" }}>Repartition par type</p>
          {segmentsType.length > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <svg viewBox="0 0 100 100" style={{ width: 78, height: 78, flexShrink: 0 }}>
                {segmentsType.map((s) => {
                  const [x1, y1] = pointCercle(s.debut, 40);
                  const [x2, y2] = pointCercle(s.fin, 40);
                  const grandArc = s.part > 0.5 ? 1 : 0;
                  return (
                    <path
                      key={s.type}
                      d={`M 50,50 L ${x1.toFixed(2)},${y1.toFixed(2)} A 40,40 0 ${grandArc} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`}
                      fill={COULEURS_TYPE[s.type] || "#6B7280"}
                    />
                  );
                })}
                <circle cx={50} cy={50} r={22} fill="#0F3320" />
              </svg>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {segmentsType.map((s) => (
                  <div key={s.type} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 2, background: COULEURS_TYPE[s.type] || "#6B7280" }} />
                    <span style={{ color: "#9BB5A5" }}>{LABELS_TYPE[s.type] || s.type}</span>
                    <span style={{ color: "#F3EFE4", fontWeight: 700 }}>{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "#9BB5A5" }}>{t("stats_aucune_donnee")}</p>
          )}
        </div>
      </div>

      {/* Top plats | Reservations */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={STYLE_CARTE}>
          <p style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 10, color: "#F3EFE4" }}>{t("stats_top_plats")}</p>
          {stats.topPlats.length === 0 ? (
            <p style={{ fontSize: 12.5, color: "#9BB5A5" }}>{t("stats_aucune_donnee")}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stats.topPlats.map((p, i) => {
                const maxQte = stats.topPlats[0].quantite;
                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 3 }}>
                      <span style={{ color: "#F3EFE4" }}>{p.nom}</span>
                      <span style={{ fontWeight: 700, color: "#F3EFE4" }}>{p.quantite}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 4, background: "#123B26", overflow: "hidden" }}>
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

        <div style={STYLE_CARTE}>
          <p style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 10, color: "#F3EFE4" }}>{t("stats_reservations_titre")}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
              <span style={{ color: "#9BB5A5" }}>{t("stats_total_reservations")}</span>
              <strong style={{ color: "#F3EFE4" }}>{stats.totalReservations}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
              <span style={{ color: "#9BB5A5" }}>{t("stats_taux_no_show")}</span>
              <strong style={{ color: stats.tauxNoShow > 15 ? "#F09595" : "#F3EFE4" }}>{stats.tauxNoShow}%</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
              <span style={{ color: "#9BB5A5" }}>{t("stats_moyenne_couverts")}</span>
              <strong style={{ color: "#F3EFE4" }}>{stats.moyenneCouverts}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
