"use client";

import { useState, useEffect, useCallback } from "react";
import { Store, TrendingUp, ShoppingBag, Users, Star, Wallet, MapPin } from "lucide-react";
import AssistantIA from "@/components/admin/AssistantIA";

type StatsPlateforme = {
  periode: number;
  totalRestaurants: number;
  nouveauxRestaurants: number;
  parTier: Record<string, number>;
  revenuActuel: number;
  evolutionRevenu: number | null;
  revenuPlateformeEstime: number;
  nombreCommandes: number;
  clientsActifs: number;
  evolutionJournaliere: { date: string; revenu: number }[];
  topRestaurants: { nom: string; revenu: number }[];
  restaurantsGeo: { id: string; nom: string; ville: string; latitude: number; longitude: number; commandes: number }[];
  satisfaction: number | null;
  totalAvis: number;
  activiteRecente: { type: string; label: string; sousLabel: string; quandISO: string }[];
};

const COULEURS_TIER: Record<string, string> = {
  starter: "#3B82F6",
  business: "#F59E0B",
  groupe: "#A855F7",
};

// Boite englobante approximative de la Cote d'Ivoire, pour projeter les
// coordonnees GPS des restaurants sur une carte schematique. Le contour
// ci-dessous est une approximation illustrative (pas un trace
// cartographique officiel) — suffisant pour situer visuellement les
// restaurants les uns par rapport aux autres.
const CI_LON_MIN = -8.6;
const CI_LON_MAX = -2.49;
const CI_LAT_MIN = 4.2;
const CI_LAT_MAX = 10.74;

const CI_CONTOUR: [number, number][] = [
  [10.5, -7.5], [10.6, -5.6], [10.4, -4.5], [9.5, -2.7], [7.0, -2.75],
  [5.6, -2.85], [5.1, -3.5], [5.25, -3.9], [4.35, -5.5], [4.35, -7.3],
  [5.3, -7.6], [6.5, -7.6], [7.5, -8.4], [8.8, -8.1], [10.5, -7.5],
];

function projeter(lat: number, lon: number, largeur: number, hauteur: number): [number, number] {
  const x = ((lon - CI_LON_MIN) / (CI_LON_MAX - CI_LON_MIN)) * largeur;
  const y = hauteur - ((lat - CI_LAT_MIN) / (CI_LAT_MAX - CI_LAT_MIN)) * hauteur;
  return [x, y];
}

function tempsEcoule(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "a l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  return `il y a ${j} j`;
}

const STYLE_CARTE: React.CSSProperties = {
  background: "#0F3320",
  borderRadius: 14,
  padding: 16,
  boxShadow: "0 2px 8px rgba(31,41,55,0.06)",
};

export default function VueEnsemble() {
  const [stats, setStats] = useState<StatsPlateforme | null>(null);
  const [periode, setPeriode] = useState(30);
  const [chargement, setChargement] = useState(true);
  const [restaurantSurvole, setRestaurantSurvole] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      const res = await fetch(`/api/stats/plateforme?periode=${periode}`);
      if (res.ok) setStats(await res.json());
    } catch {
      // Echec silencieux
    }
    setChargement(false);
  }, [periode]);

  useEffect(() => {
    charger();
  }, [charger]);

  if (chargement && !stats) return null;
  if (!stats) return null;

  const largeurCarte = 300;
  const hauteurCarte = 300;
  const contourPoints = CI_CONTOUR.map(([lat, lon]) => projeter(lat, lon, largeurCarte, hauteurCarte))
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const maxCommandesGeo = Math.max(...stats.restaurantsGeo.map((r) => r.commandes), 1);

  const totalTier = Object.values(stats.parTier).reduce((s, n) => s + n, 0) || 1;
  let angleCumule = 0;
  const segmentsTier = Object.entries(stats.parTier).map(([tier, count]) => {
    const part = count / totalTier;
    const debut = angleCumule;
    angleCumule += part;
    return { tier, count, debut, fin: angleCumule, part };
  });

  function pointCercle(fraction: number, rayon: number): [number, number] {
    const angle = fraction * 2 * Math.PI - Math.PI / 2;
    return [50 + rayon * Math.cos(angle), 50 + rayon * Math.sin(angle)];
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 800, color: "#F3EFE4", margin: 0 }}>
          Vue d'ensemble
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          {[7, 30, 90].map((p) => (
            <button
              key={p}
              onClick={() => setPeriode(p)}
              style={{
                padding: "4px 12px", borderRadius: 20, border: "1px solid #1D4A31",
                background: periode === p ? "#F59E0B" : "#0F3320",
                color: periode === p ? "white" : "#9BB5A5",
                fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {p}j
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))", gap: 10, marginBottom: 14 }}>
        <KpiCard icon={Store} label="Restaurants" valeur={stats.totalRestaurants} evolution={`+${stats.nouveauxRestaurants}`} />
        <KpiCard icon={TrendingUp} label={`CA (${periode}j)`} valeur={`${stats.revenuActuel.toLocaleString()} FCFA`} evolution={stats.evolutionRevenu != null ? `${stats.evolutionRevenu >= 0 ? "+" : ""}${stats.evolutionRevenu}%` : undefined} />
        <KpiCard icon={ShoppingBag} label="Commandes" valeur={stats.nombreCommandes} />
        <KpiCard icon={Users} label="Clients actifs" valeur={stats.clientsActifs} />
        <KpiCard icon={Star} label="Satisfaction" valeur={stats.satisfaction != null ? `${stats.satisfaction}%` : "—"} />
        <KpiCard icon={Wallet} label="Revenus AfriTable" valeur={`${stats.revenuPlateformeEstime.toLocaleString()} FCFA/mois`} note="abonnements actifs" />
      </div>

      {/* Rangee 1 : CA | Carte | Activite */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 1.2fr) minmax(220px, 1fr) minmax(220px, 1fr)", gap: 14, marginBottom: 14 }}>
        <div style={STYLE_CARTE}>
          <p style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 10, color: "#F3EFE4" }}>Chiffre d'affaires plateforme</p>
          {stats.evolutionJournaliere.length > 0 ? (
            <svg viewBox="0 0 400 110" style={{ width: "100%", height: 110 }} preserveAspectRatio="none">
              {(() => {
                const data = stats.evolutionJournaliere;
                const maxVal = Math.max(...data.map((d) => d.revenu), 1);
                const step = data.length > 1 ? 400 / (data.length - 1) : 0;
                const points = data.map((d, i) => [i * step, 100 - (d.revenu / maxVal) * 90]);
                const ligne = points.map((p) => p.join(",")).join(" ");
                const aire = `0,100 ${ligne} ${(data.length - 1) * step},100`;
                return (
                  <>
                    <polygon points={aire} fill="url(#degradeCA)" />
                    <polyline points={ligne} fill="none" stroke="#F59E0B" strokeWidth={2.5} />
                    <defs>
                      <linearGradient id="degradeCA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </>
                );
              })()}
            </svg>
          ) : (
            <p style={{ fontSize: 12.5, color: "#9BB5A5" }}>Pas encore de donnees sur cette periode.</p>
          )}
        </div>

        <div style={STYLE_CARTE}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <MapPin size={13} color="#F59E0B" />
            <p style={{ fontSize: 12.5, fontWeight: 600, color: "#F3EFE4", margin: 0 }}>Restaurants localises</p>
          </div>
          <p style={{ fontSize: 10, color: "#9BB5A5", marginBottom: 8 }}>
            Carte schematique indicative — taille = commandes sur la periode.
          </p>
          {stats.restaurantsGeo.length > 0 ? (
            <svg viewBox={`0 0 ${largeurCarte} ${hauteurCarte}`} style={{ width: "100%", height: 170 }}>
              <polygon points={contourPoints} fill="#0B2818" stroke="#1D4A31" strokeWidth={1.5} />
              {stats.restaurantsGeo.map((r) => {
                const [x, y] = projeter(r.latitude, r.longitude, largeurCarte, hauteurCarte);
                const rayon = 3 + (r.commandes / maxCommandesGeo) * 8;
                const survole = restaurantSurvole === r.id;
                return (
                  <circle
                    key={r.id}
                    cx={x}
                    cy={y}
                    r={rayon}
                    fill={survole ? "#F59E0B" : "#97C459"}
                    fillOpacity={0.85}
                    stroke="#0B2818"
                    strokeWidth={1}
                    onMouseEnter={() => setRestaurantSurvole(r.id)}
                    onMouseLeave={() => setRestaurantSurvole(null)}
                    style={{ cursor: "pointer" }}
                  >
                    <title>{`${r.nom} — ${r.ville || ""} — ${r.commandes} commande(s)`}</title>
                  </circle>
                );
              })}
            </svg>
          ) : (
            <p style={{ fontSize: 12.5, color: "#9BB5A5" }}>Aucun restaurant localise pour le moment.</p>
          )}
        </div>

        <div style={STYLE_CARTE}>
          <p style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8, color: "#F3EFE4" }}>Activite en temps reel</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 190, overflow: "auto" }}>
            {stats.activiteRecente.length === 0 && (
              <p style={{ fontSize: 12.5, color: "#9BB5A5" }}>Aucune activite recente.</p>
            )}
            {stats.activiteRecente.map((ev, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 6, fontSize: 11.5 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ color: "#F3EFE4", margin: 0, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.label}</p>
                  <p style={{ color: "#9BB5A5", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.sousLabel}</p>
                </div>
                <span style={{ color: "#9BB5A5", whiteSpace: "nowrap", flexShrink: 0 }}>{tempsEcoule(ev.quandISO)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rangee 2 : Top restaurants | Repartition par pack | Assistant IA */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 1.2fr) minmax(220px, 1fr) minmax(220px, 1fr)", gap: 14 }}>
        <div style={STYLE_CARTE}>
          <p style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 10, color: "#F3EFE4" }}>Top restaurants (par CA)</p>
          {stats.topRestaurants.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stats.topRestaurants.map((r, i) => {
                const maxRevenu = stats.topRestaurants[0].revenu;
                return (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 3 }}>
                      <span style={{ color: "#F3EFE4" }}>{r.nom}</span>
                      <span style={{ fontWeight: 700, color: "#F3EFE4" }}>{r.revenu.toLocaleString()} FCFA</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 4, background: "#123B26", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 4, background: "#F59E0B", width: `${(r.revenu / maxRevenu) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: 12.5, color: "#9BB5A5" }}>Pas encore de donnees.</p>
          )}
        </div>

        <div style={STYLE_CARTE}>
          <p style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 10, color: "#F3EFE4" }}>Repartition par pack</p>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg viewBox="0 0 100 100" style={{ width: 76, height: 76, flexShrink: 0 }}>
              {segmentsTier.map((s) => {
                const [x1, y1] = pointCercle(s.debut, 40);
                const [x2, y2] = pointCercle(s.fin, 40);
                const grandArc = s.part > 0.5 ? 1 : 0;
                return (
                  <path
                    key={s.tier}
                    d={`M 50,50 L ${x1.toFixed(2)},${y1.toFixed(2)} A 40,40 0 ${grandArc} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`}
                    fill={COULEURS_TIER[s.tier] || "#6B7280"}
                  />
                );
              })}
              <circle cx={50} cy={50} r={22} fill="#0F3320" />
            </svg>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {segmentsTier.map((s) => (
                <div key={s.tier} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: COULEURS_TIER[s.tier] || "#6B7280" }} />
                  <span style={{ color: "#9BB5A5", textTransform: "capitalize" }}>{s.tier}</span>
                  <span style={{ color: "#F3EFE4", fontWeight: 700 }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <AssistantIA compact />
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  valeur,
  evolution,
  note,
}: {
  icon: React.ElementType;
  label: string;
  valeur: string | number;
  evolution?: string;
  note?: string;
}) {
  return (
    <div style={{ padding: 12, borderRadius: 12, background: "#0F3320", boxShadow: "0 2px 8px rgba(31,41,55,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
        <Icon size={12} color="#9BB5A5" />
        <p style={{ fontSize: 11, color: "#9BB5A5", margin: 0 }}>{label}</p>
      </div>
      <p style={{ fontSize: 16, fontWeight: 800, fontFamily: "system-ui, sans-serif", color: "#F3EFE4", margin: 0 }}>
        {valeur}
        {evolution && (
          <span style={{ fontSize: 10.5, fontWeight: 700, color: evolution.startsWith("-") ? "#F09595" : "#97C459", marginLeft: 6 }}>
            {evolution}
          </span>
        )}
      </p>
      {note && <p style={{ fontSize: 9.5, color: "#6B8577", margin: "2px 0 0" }}>{note}</p>}
    </div>
  );
}
