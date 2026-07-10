"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, Users, Pencil } from "lucide-react";

type TableSalle = {
  id: string;
  nom: string;
  forme: "ronde" | "carree";
  capacite: number;
  position_x: number;
  position_y: number;
  largeur: number;
  statut_manuel: string | null;
  statut: "libre" | "reservee" | "occupee";
  reservation: { heure: string; nb_personnes: number } | null;
};

const STATUT_COULEURS: Record<string, { bg: string; border: string; text: string }> = {
  libre: { bg: "#1D4A31", border: "#97C459", text: "#97C459" },
  reservee: { bg: "#412402", border: "#FAC775", text: "#FAC775" },
  occupee: { bg: "#501313", border: "#F09595", text: "#F09595" },
};

export default function PlanDeSalle({
  restaurantId,
  peutEditer,
}: {
  restaurantId: string;
  peutEditer: boolean;
}) {
  const t = useTranslations();
  const [tables, setTables] = useState<TableSalle[]>([]);
  const [chargement, setChargement] = useState(true);
  const [tableSelectionnee, setTableSelectionnee] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragInfo = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const chargerTables = useCallback(async () => {
    try {
      const res = await fetch(`/api/tables?restaurantId=${restaurantId}`);
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables || []);
      }
    } catch {
      // Echec silencieux
    }
    setChargement(false);
  }, [restaurantId]);

  useEffect(() => {
    chargerTables();
    // Rafraichissement periodique pour le statut temps reel (reservations)
    const interval = setInterval(chargerTables, 20000);
    return () => clearInterval(interval);
  }, [chargerTables]);

  async function ajouterTable() {
    const nom = prompt(t("plan_nom_table_prompt"));
    if (!nom) return;
    const capaciteStr = prompt(t("plan_capacite_prompt"), "2");
    const capacite = parseInt(capaciteStr || "2", 10) || 2;

    const res = await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantId,
        nom,
        forme: "carree",
        capacite,
        positionX: 20 + Math.random() * 60,
        positionY: 20 + Math.random() * 60,
      }),
    });
    if (res.ok) chargerTables();
  }

  async function supprimerTableSelectionnee() {
    if (!tableSelectionnee) return;
    if (!confirm(t("plan_confirmer_suppression"))) return;
    await fetch(`/api/tables?id=${tableSelectionnee}&restaurantId=${restaurantId}`, {
      method: "DELETE",
    });
    setTableSelectionnee(null);
    chargerTables();
  }

  async function modifierTableSelectionnee() {
    if (!tableSelectionnee) return;
    const table = tables.find((t) => t.id === tableSelectionnee);
    if (!table) return;

    const nom = prompt(t("plan_nom_table_prompt"), table.nom);
    if (!nom) return;
    const capaciteStr = prompt(t("plan_capacite_prompt"), String(table.capacite));
    const capacite = parseInt(capaciteStr || String(table.capacite), 10) || table.capacite;

    await fetch("/api/tables", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: tableSelectionnee, restaurantId, nom, capacite }),
    });
    chargerTables();
  }

  async function toggleOccupee(table: TableSalle) {
    const nouveauStatut = table.statut_manuel === "occupee" ? null : "occupee";
    await fetch("/api/tables", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: table.id, restaurantId, statut_manuel: nouveauStatut }),
    });
    chargerTables();
  }

  function handlePointerDown(e: React.PointerEvent, table: TableSalle) {
    if (!peutEditer) {
      // Personnel de salle/cuisine : simple clic pour marquer occupee/libre
      toggleOccupee(table);
      return;
    }
    setTableSelectionnee(table.id);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const tableX = (table.position_x / 100) * rect.width;
    const tableY = (table.position_y / 100) * rect.height;
    dragInfo.current = {
      id: table.id,
      offsetX: e.clientX - rect.left - tableX,
      offsetY: e.clientY - rect.top - tableY,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragInfo.current || !peutEditer) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - dragInfo.current.offsetX;
    const y = e.clientY - rect.top - dragInfo.current.offsetY;
    const pctX = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const pctY = Math.max(0, Math.min(100, (y / rect.height) * 100));

    setTables((prev) =>
      prev.map((tb) =>
        tb.id === dragInfo.current!.id ? { ...tb, position_x: pctX, position_y: pctY } : tb
      )
    );
  }

  async function handlePointerUp() {
    if (!dragInfo.current || !peutEditer) return;
    const table = tables.find((tb) => tb.id === dragInfo.current!.id);
    dragInfo.current = null;
    if (!table) return;

    await fetch("/api/tables", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: table.id,
        restaurantId,
        position_x: table.position_x,
        position_y: table.position_y,
      }),
    });
  }

  if (chargement) {
    return <p style={{ fontSize: 13, color: "#9BB5A5" }}>{t("chargement")}</p>;
  }

  return (
    <div>
      {peutEditer && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            onClick={ajouterTable}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 10, border: "none",
              background: "#F59E0B", color: "#F3EFE4", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <Plus size={15} />
            {t("plan_ajouter_table")}
          </button>
          {tableSelectionnee && (
            <button
              onClick={modifierTableSelectionnee}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 10, border: "1px solid #1D4A31",
                background: "#0F3320", color: "#9BB5A5", fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <Pencil size={14} />
              {t("plan_modifier_table")}
            </button>
          )}
          {tableSelectionnee && (
            <button
              onClick={supprimerTableSelectionnee}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 10, border: "1px solid #501313",
                background: "#501313", color: "#F09595", fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <Trash2 size={14} />
              {t("plan_supprimer_table")}
            </button>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 12 }}>
        {["libre", "reservee", "occupee"].map((s) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              width: 10, height: 10, borderRadius: "50%",
              background: STATUT_COULEURS[s].border,
            }} />
            <span style={{ color: "#9BB5A5" }}>{t(`plan_statut_${s}`)}</span>
          </div>
        ))}
      </div>

      <div
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          position: "relative",
          width: "100%",
          height: 380,
          background: "#0B2818",
          borderRadius: 16,
          border: "1px solid #1D4A31",
          overflow: "hidden",
          touchAction: "none",
        }}
      >
        {tables.length === 0 ? (
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            alignItems: "center", justifyContent: "center",
            color: "#9BB5A5", fontSize: 13, textAlign: "center", padding: 24,
          }}>
            {peutEditer ? t("plan_vide_editeur") : t("plan_vide_lecture")}
          </div>
        ) : (
          tables.map((table) => {
            const couleurs = STATUT_COULEURS[table.statut];
            return (
              <div
                key={table.id}
                onPointerDown={(e) => handlePointerDown(e, table)}
                style={{
                  position: "absolute",
                  left: `${table.position_x}%`,
                  top: `${table.position_y}%`,
                  transform: "translate(-50%, -50%)",
                  width: table.largeur,
                  height: table.largeur,
                  borderRadius: table.forme === "ronde" ? "50%" : 12,
                  background: couleurs.bg,
                  border: `2px solid ${couleurs.border}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: peutEditer ? "grab" : "pointer",
                  userSelect: "none",
                  boxShadow: tableSelectionnee === table.id ? "0 0 0 3px rgba(245,158,11,0.3)" : "0 2px 6px rgba(31,41,55,0.1)",
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: couleurs.text }}>{table.nom}</span>
                <span style={{ fontSize: 10, color: couleurs.text, display: "flex", alignItems: "center", gap: 2 }}>
                  <Users size={10} />
                  {table.capacite}
                </span>
                {table.reservation && (
                  <span style={{ fontSize: 9, color: couleurs.text }}>
                    {table.reservation.heure.slice(0, 5)}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
