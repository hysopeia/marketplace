"use client";

import { useState, useEffect, useCallback } from "react";
import { Users } from "lucide-react";

type PersonneEnService = { email: string; depuis: string };

export default function PersonnelEnService({ restaurantId }: { restaurantId: string }) {
  const [liste, setListe] = useState<PersonneEnService[]>([]);
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

  if (chargement || liste.length === 0) return null;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      background: "#DCFCE7", border: "1px solid #BBF7D0", borderRadius: 12,
      padding: "10px 16px", marginBottom: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <Users size={14} color="#16A34A" />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#16A34A" }}>
          {liste.length} en service
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
        {liste.map((p) => (
          <span key={p.email} style={{ fontSize: 12, color: "#166534" }}>
            {p.email}
            <span style={{ opacity: 0.7 }}>
              {" "}— depuis {new Date(p.depuis).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
