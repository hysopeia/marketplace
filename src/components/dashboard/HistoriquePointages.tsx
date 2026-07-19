"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock } from "lucide-react";

type Pointage = { id: string; email: string; type: "entree" | "sortie"; created_at: string };

export default function HistoriquePointages({ restaurantId }: { restaurantId: string }) {
  const [historique, setHistorique] = useState<Pointage[]>([]);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    try {
      const res = await fetch(`/api/pointages?restaurantId=${restaurantId}`);
      if (res.ok) {
        const data = await res.json();
        setHistorique(data.historique || []);
      }
    } catch {
      // Echec silencieux
    }
    setChargement(false);
  }, [restaurantId]);

  useEffect(() => {
    charger();
  }, [charger]);

  if (chargement) return null;

  return (
    <div style={{
      background: "#FFFFFF", borderRadius: 16,
      padding: "20px 22px", marginBottom: 24,
      boxShadow: "0 4px 16px rgba(31,41,55,0.09)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: "#DBEAFE",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Clock size={16} color="#2563EB" />
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#1F2937", margin: 0 }}>
          Historique des pointages
        </p>
      </div>

      {historique.length === 0 ? (
        <p style={{ fontSize: 13, color: "#6B7280" }}>Aucun pointage enregistre pour le moment.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflow: "auto" }}>
          {historique.map((p) => (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
              padding: "8px 12px", borderRadius: 10, background: "#F1F3F6", fontSize: 13,
            }}>
              <span style={{ color: "#1F2937", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.email}
              </span>
              <span style={{
                padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                color: p.type === "entree" ? "#16A34A" : "#DC2626",
                background: p.type === "entree" ? "#DCFCE7" : "#FEE2E2",
              }}>
                {p.type === "entree" ? "Prise de service" : "Fin de service"}
              </span>
              <span style={{ color: "#6B7280", whiteSpace: "nowrap" }}>
                {new Date(p.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}{" "}
                {new Date(p.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
