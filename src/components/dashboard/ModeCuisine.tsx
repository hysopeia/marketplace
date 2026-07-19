"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, UtensilsCrossed, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

type CommandeCuisine = {
  id: string;
  type: string;
  statut: "recue" | "en_preparation" | "prete";
  createdAt: string;
  heureDebutPreparation: string | null;
  heurePrete: string | null;
  heureRecuperee: string | null;
  table: string | null;
  plats: { nom: string; quantite: number }[];
};

const LABELS_TYPE: Record<string, string> = {
  sur_place: "Sur place",
  retrait: "A retirer",
  livraison: "Livraison",
};

function minutesEcoulees(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

function heureLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// Couleur de la carte evolue selon le delai reel — vert tant que c'est
// recent, orange puis rouge si ca traine. Bases uniquement sur le
// temps ecoule (aucun champ "priorite" fabrique).
function couleurDelai(minutes: number): { fond: string; bordure: string; texte: string } {
  if (minutes >= 20) return { fond: "#FEE2E2", bordure: "#DC2626", texte: "#DC2626" };
  if (minutes >= 10) return { fond: "#FEF3C7", bordure: "#D97706", texte: "#D97706" };
  return { fond: "#DCFCE7", bordure: "#16A34A", texte: "#16A34A" };
}

export default function ModeCuisine({ restaurantId }: { restaurantId: string }) {
  const [commandes, setCommandes] = useState<CommandeCuisine[]>([]);
  const [, forceRerender] = useState(0);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    try {
      const res = await fetch(`/api/commandes/cuisine?restaurantId=${restaurantId}`);
      if (res.ok) {
        const data = await res.json();
        setCommandes(data.commandes || []);
      }
    } catch {
      // Echec silencieux
    }
    setChargement(false);
  }, [restaurantId]);

  useEffect(() => {
    charger();
    const interval = setInterval(charger, 15000);
    return () => clearInterval(interval);
  }, [charger]);

  // Rafraichit l'affichage du temps ecoule chaque minute, sans
  // recharger les donnees.
  useEffect(() => {
    const interval = setInterval(() => forceRerender((n) => n + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  async function changerStatut(id: string, statut: string) {
    setCommandes((prev) => prev.map((c) => (c.id === id ? { ...c, statut: statut as CommandeCuisine["statut"] } : c)));
    await fetch("/api/commandes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, restaurantId, statut }),
    });
    charger();
  }

  const enAttente = commandes.filter((c) => c.statut === "recue" || c.statut === "en_preparation");
  const pretes = commandes.filter((c) => c.statut === "prete");

  if (chargement) return null;

  if (commandes.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px", color: "#6B7280" }}>
        <UtensilsCrossed size={40} color="#D1D5DB" style={{ marginBottom: 12 }} />
        <p style={{ fontSize: 18, fontWeight: 500 }}>Aucune commande en cuisine pour le moment.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: pretes.length > 0 ? 28 : 0 }}>
        {enAttente.map((c) => {
          const minutes = minutesEcoulees(c.createdAt);
          const couleur = couleurDelai(minutes);
          return (
            <div
              key={c.id}
              style={{
                background: "#FFFFFF", border: `2px solid ${couleur.bordure}`, borderRadius: 18,
                padding: 20, boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <p style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 800, color: "#1F2937", margin: 0 }}>
                  #{c.id.slice(-6).toUpperCase()}
                </p>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "5px 12px", borderRadius: 20, fontSize: 13.5, fontWeight: 800,
                  color: couleur.texte, background: couleur.fond,
                }}>
                  {minutes >= 20 ? <AlertTriangle size={14} /> : <Clock size={14} />}
                  {minutes} min
                </span>
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 12.5, color: "#6B7280", fontWeight: 600 }}>
                  {LABELS_TYPE[c.type] || c.type}
                </span>
                {c.table && (
                  <span style={{ fontSize: 12.5, color: "#6B7280" }}>· {c.table}</span>
                )}
                <span style={{ fontSize: 12.5, color: "#6B7280" }}>
                  · Recue a {heureLabel(c.createdAt)}
                </span>
                {c.heureDebutPreparation && (
                  <span style={{ fontSize: 12.5, color: "#6B7280" }}>
                    · En prepa depuis {heureLabel(c.heureDebutPreparation)}
                  </span>
                )}
              </div>

              {c.plats.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
                  {c.plats.map((p, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 15 }}>
                      <span style={{ color: "#1F2937" }}>{p.nom}</span>
                      <span style={{ fontWeight: 700, color: "#1F2937" }}>x{p.quantite}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 18 }}>Detail des plats indisponible.</p>
              )}

              {c.statut === "recue" ? (
                <button
                  onClick={() => changerStatut(c.id, "en_preparation")}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "13px 0", borderRadius: 12, border: "none",
                    background: "#F59E0B", color: "#FFFFFF", fontWeight: 700, fontSize: 15,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  <Play size={16} />
                  Commencer
                </button>
              ) : (
                <button
                  onClick={() => changerStatut(c.id, "prete")}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "13px 0", borderRadius: 12, border: "none",
                    background: "#16A34A", color: "#FFFFFF", fontWeight: 700, fontSize: 15,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  <CheckCircle2 size={16} />
                  Prete !
                </button>
              )}
            </div>
          );
        })}
      </div>

      {pretes.length > 0 && (
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#6B7280", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Pretes — en attente de retrait
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            {pretes.map((c) => (
              <div key={c.id} style={{
                background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12,
                padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#1F2937" }}>#{c.id.slice(-6).toUpperCase()}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 5, color: "#16A34A", fontSize: 12.5, fontWeight: 700 }}>
                  <CheckCircle2 size={13} /> Prete {c.heurePrete ? `a ${heureLabel(c.heurePrete)}` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
