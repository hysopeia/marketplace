"use client";

import { useState, useEffect, useCallback } from "react";
import { LogIn, LogOut } from "lucide-react";

export default function PointageWidget({ restaurantId }: { restaurantId: string }) {
  const [dernierType, setDernierType] = useState<"entree" | "sortie" | null>(null);
  const [dernierPointageA, setDernierPointageA] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const [pret, setPret] = useState(false);

  const charger = useCallback(async () => {
    try {
      const res = await fetch(`/api/pointages?restaurantId=${restaurantId}`);
      if (res.ok) {
        const data = await res.json();
        setDernierType(data.dernierType);
        setDernierPointageA(data.dernierPointageA);
      }
    } catch {
      // Echec silencieux
    }
    setPret(true);
  }, [restaurantId]);

  useEffect(() => {
    charger();
  }, [charger]);

  async function pointer() {
    const nouveauType = dernierType === "entree" ? "sortie" : "entree";
    setChargement(true);
    setDernierType(nouveauType);
    setDernierPointageA(new Date().toISOString());
    try {
      await fetch("/api/pointages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, type: nouveauType }),
      });
    } catch {
      // Echec silencieux — l'affichage optimiste reste, un rechargement
      // de page redonnera l'etat reel si l'envoi a echoue.
    }
    setChargement(false);
  }

  if (!pret) return null;

  const enService = dernierType === "entree";

  return (
    <div style={{
      background: enService ? "#DCFCE7" : "#F1F3F6",
      border: `1px solid ${enService ? "#BBF7D0" : "#E5E7EB"}`,
      borderRadius: 12, padding: "10px 12px", marginBottom: 12,
    }}>
      <p style={{ fontSize: 11, color: enService ? "#16A34A" : "#6B7280", fontWeight: 700, margin: "0 0 2px" }}>
        {enService ? "En service" : "Hors service"}
      </p>
      {dernierPointageA && (
        <p style={{ fontSize: 10.5, color: "#6B7280", margin: "0 0 8px" }}>
          {enService ? "Depuis" : "Fin a"} {new Date(dernierPointageA).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
      <button
        onClick={pointer}
        disabled={chargement}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%",
          padding: "7px 0", borderRadius: 8, border: "none",
          background: enService ? "#DC2626" : "#16A34A", color: "#FFFFFF",
          fontSize: 12, fontWeight: 700, cursor: chargement ? "not-allowed" : "pointer", fontFamily: "inherit",
        }}
      >
        {enService ? <LogOut size={13} /> : <LogIn size={13} />}
        {enService ? "Fin de service" : "Prise de service"}
      </button>
    </div>
  );
}
