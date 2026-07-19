"use client";

import { useState, useEffect, useCallback } from "react";
import { Handshake, ChevronDown } from "lucide-react";

type Lead = {
  id: string;
  nom_restaurant: string;
  nom_contact: string;
  telephone: string;
  email: string | null;
  ville: string | null;
  pays: string | null;
  message: string | null;
  statut: "nouveau" | "contacte" | "converti" | "abandonne";
  created_at: string;
};

const STATUTS: Lead["statut"][] = ["nouveau", "contacte", "converti", "abandonne"];

const STATUT_LABELS: Record<Lead["statut"], string> = {
  nouveau: "Nouveau",
  contacte: "Contacte",
  converti: "Converti",
  abandonne: "Abandonne",
};

const STATUT_COULEURS: Record<Lead["statut"], { bg: string; texte: string }> = {
  nouveau: { bg: "#FEF3C7", texte: "#D97706" },
  contacte: { bg: "#DBEAFE", texte: "#2563EB" },
  converti: { bg: "#DCFCE7", texte: "#16A34A" },
  abandonne: { bg: "#F1F3F6", texte: "#6B7280" },
};

export default function PartenariatLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    try {
      const res = await fetch("/api/partenariat");
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch {
      // Echec silencieux
    }
    setChargement(false);
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  async function changerStatut(id: string, statut: Lead["statut"]) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, statut } : l)));
    await fetch("/api/partenariat", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, statut }),
    });
  }

  const nouveaux = leads.filter((l) => l.statut === "nouveau").length;

  if (chargement) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(!ouvert)}
        style={{
          background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12,
          padding: "14px 16px", boxShadow: "0 1px 3px rgba(17,24,39,0.08)",
          cursor: "pointer", textAlign: "left", fontFamily: "inherit", width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: "#9333EA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Handshake size={13} color="white" />
            </div>
            <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>Demandes partenariat</p>
          </div>
          <ChevronDown size={14} color="#9CA3AF" style={{ transform: ouvert ? "rotate(180deg)" : "none" }} />
        </div>
        <p style={{ fontSize: 18, fontWeight: 800, color: "#1F2937", margin: "8px 0 0", fontFamily: "system-ui, sans-serif" }}>
          {leads.length}
          {nouveaux > 0 && (
            <span style={{
              fontSize: 10.5, fontWeight: 700, color: "#D97706", background: "#FEF3C7",
              borderRadius: 20, padding: "2px 8px", marginLeft: 8,
            }}>
              {nouveaux} nouvelle{nouveaux > 1 ? "s" : ""}
            </span>
          )}
        </p>
      </button>

      {ouvert && (
        <div style={{
          background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 16,
          padding: 20, marginTop: 12, marginBottom: 16,
          boxShadow: "0 1px 3px rgba(17,24,39,0.08)",
          gridColumn: "1 / -1",
        }}>
          {leads.length === 0 ? (
            <p style={{ fontSize: 13, color: "#6B7280" }}>Aucune demande de partenariat pour le moment.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {leads.map((lead) => {
                const couleur = STATUT_COULEURS[lead.statut];
                return (
                  <div key={lead.id} style={{
                    padding: "12px 14px", borderRadius: 10, background: "#F1F3F6",
                    display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between",
                  }}>
                    <div style={{ fontSize: 13, minWidth: 200 }}>
                      <strong style={{ color: "#1F2937" }}>{lead.nom_restaurant}</strong>
                      <span style={{ color: "#6B7280" }}> — {lead.nom_contact} · {lead.telephone}</span>
                      {(lead.ville || lead.pays) && (
                        <div style={{ color: "#6B7280", fontSize: 12 }}>
                          {[lead.ville, lead.pays].filter(Boolean).join(", ")}
                        </div>
                      )}
                      {lead.message && (
                        <div style={{ color: "#6B7280", fontSize: 12, marginTop: 2, fontStyle: "italic" }}>
                          "{lead.message}"
                        </div>
                      )}
                    </div>
                    <select
                      value={lead.statut}
                      onChange={(e) => changerStatut(lead.id, e.target.value as Lead["statut"])}
                      style={{
                        padding: "5px 10px", borderRadius: 8, border: "none",
                        background: couleur.bg, color: couleur.texte,
                        fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      {STATUTS.map((s) => (
                        <option key={s} value={s}>{STATUT_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}
