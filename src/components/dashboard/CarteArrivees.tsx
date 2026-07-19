"use client";

import { useState, useEffect, useCallback } from "react";
import { LogIn } from "lucide-react";

type Entree = { nom: string; depuis: string };

export default function CarteArrivees({ restaurantId }: { restaurantId: string }) {
  const [liste, setListe] = useState<Entree[]>([]);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    try {
      const res = await fetch(`/api/pointages?restaurantId=${restaurantId}`);
      if (res.ok) {
        const data = await res.json();
        setListe(data.enService || []);
      }
    } catch {
      // Echec silencieux
    }
    setChargement(false);
  }, [restaurantId]);

  useEffect(() => {
    charger();
    const interval = setInterval(charger, 60000);
    return () => clearInterval(interval);
  }, [charger]);

  if (chargement) return null;

  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 8, background: "#16A34A", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <LogIn size={13} color="white" />
        </div>
        <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>En service</p>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#1F2937", marginLeft: "auto", fontFamily: "system-ui, sans-serif" }}>
          {liste.length}
        </span>
      </div>
      {liste.length === 0 ? (
        <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Personne en service actuellement.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 110, overflow: "auto" }}>
          {liste.map((p) => (
            <div key={p.nom} style={{ fontSize: 12 }}>
              <span style={{ color: "#1F2937", fontWeight: 600 }}>{p.nom}</span>
              <span style={{ color: "#6B7280" }}>
                {" "}— {new Date(p.depuis).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}{" "}
                {new Date(p.depuis).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
