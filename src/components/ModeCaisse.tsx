"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { QrCode, Banknote, CheckCircle2, ArrowLeft } from "lucide-react";

type TableOption = { id: string; nom: string; statut: string };
type CommandeOption = { id: string; montant_total: number; devise: string; type: string; created_at: string };

export default function ModeCaisse({ restaurantId }: { restaurantId: string }) {
  const t = useTranslations();
  const [tables, setTables] = useState<TableOption[]>([]);
  const [commandesActives, setCommandesActives] = useState<CommandeOption[]>([]);
  const [tableId, setTableId] = useState("");
  const [commandeId, setCommandeId] = useState("");
  const [montant, setMontant] = useState("");
  const [etape, setEtape] = useState<"formulaire" | "qr" | "succes">("formulaire");
  const [qrImage, setQrImage] = useState("");
  const [commandeEnCours, setCommandeEnCours] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const [montantFinal, setMontantFinal] = useState(0);

  useEffect(() => {
    fetch(`/api/tables?restaurantId=${restaurantId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setTables(data.tables || []))
      .catch(() => {});

    fetch(`/api/commandes?restaurantId=${restaurantId}&actives=true`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setCommandesActives(data.commandes || []))
      .catch(() => {});
  }, [restaurantId]);

  // Sondage du statut pendant l'attente du paiement QR
  useEffect(() => {
    if (etape !== "qr" || !commandeEnCours) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/caisse?commandeId=${commandeEnCours}`);
      if (res.ok) {
        const data = await res.json();
        if (data.statut === "recuperee") {
          setEtape("succes");
          clearInterval(interval);
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [etape, commandeEnCours]);

  async function lancerEncaissement(methodePaiement: "qr" | "especes") {
    setErreur("");

    if (!commandeId && (!montant || Number(montant) <= 0)) {
      setErreur(t("caisse_montant_requis"));
      return;
    }

    setChargement(true);
    try {
      const res = await fetch("/api/caisse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          tableId: tableId || null,
          commandeId: commandeId || null,
          montant: commandeId ? undefined : Number(montant),
          methodePaiement,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErreur(data.error || t("erreur_generique"));
        setChargement(false);
        return;
      }

      setMontantFinal(data.montant);

      if (methodePaiement === "especes") {
        setEtape("succes");
      } else {
        setQrImage(data.qrImage);
        setCommandeEnCours(data.commandeId);
        setEtape("qr");
      }
    } catch {
      setErreur(t("erreur_generique"));
    }
    setChargement(false);
  }

  function reinitialiser() {
    setTableId("");
    setCommandeId("");
    setMontant("");
    setEtape("formulaire");
    setQrImage("");
    setCommandeEnCours("");
    setErreur("");
  }

  if (etape === "succes") {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px" }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%", background: "#EAF3DE",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px",
        }}>
          <CheckCircle2 size={32} color="#3B6D11" />
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{t("caisse_paiement_reussi")}</h3>
        <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 24 }}>
          {montantFinal.toLocaleString()} {t("caisse_encaisse")}
        </p>
        <button
          onClick={reinitialiser}
          style={{
            padding: "10px 24px", borderRadius: 10, border: "none",
            background: "#C75B39", color: "white", fontWeight: 600,
            fontSize: 14, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          {t("caisse_nouvelle_vente")}
        </button>
      </div>
    );
  }

  if (etape === "qr") {
    return (
      <div style={{ textAlign: "center", padding: "32px 24px" }}>
        <button
          onClick={reinitialiser}
          style={{
            display: "flex", alignItems: "center", gap: 6, margin: "0 auto 20px",
            background: "none", border: "none", color: "#6B7280", fontSize: 13,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <ArrowLeft size={14} /> {t("caisse_annuler")}
        </button>
        <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 16 }}>
          {t("caisse_scanner_qr")} — <strong>{montantFinal.toLocaleString()} FCFA</strong>
        </p>
        {qrImage && (
          <img
            src={qrImage}
            alt="QR de paiement"
            style={{ width: 220, height: 220, margin: "0 auto", borderRadius: 12, border: "1px solid #E5E1D8" }}
          />
        )}
        <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 16 }}>
          {t("caisse_attente_paiement")}
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480 }}>
      {erreur && (
        <p style={{ fontSize: 13, color: "#B91C1C", marginBottom: 12 }}>{erreur}</p>
      )}

      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
        {t("caisse_table_optionnelle")}
      </label>
      <select
        value={tableId}
        onChange={(e) => setTableId(e.target.value)}
        style={{
          width: "100%", padding: "10px 12px", border: "1px solid #E5E1D8",
          borderRadius: 10, fontSize: 14, marginBottom: 16, background: "white",
        }}
      >
        <option value="">{t("caisse_aucune_table")}</option>
        {tables.map((tb) => (
          <option key={tb.id} value={tb.id}>{tb.nom}</option>
        ))}
      </select>

      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
        {t("caisse_commande_optionnelle")}
      </label>
      <select
        value={commandeId}
        onChange={(e) => setCommandeId(e.target.value)}
        style={{
          width: "100%", padding: "10px 12px", border: "1px solid #E5E1D8",
          borderRadius: 10, fontSize: 14, marginBottom: 16, background: "white",
        }}
      >
        <option value="">{t("caisse_nouvelle_saisie")}</option>
        {commandesActives.map((c) => (
          <option key={c.id} value={c.id}>
            #{c.id.slice(0, 6).toUpperCase()} — {c.montant_total.toLocaleString()} {c.devise}
          </option>
        ))}
      </select>

      {!commandeId && (
        <>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            {t("caisse_montant")}
          </label>
          <input
            type="number"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            placeholder="10000"
            style={{
              width: "100%", padding: "10px 12px", border: "1px solid #E5E1D8",
              borderRadius: 10, fontSize: 14, marginBottom: 20, boxSizing: "border-box",
            }}
          />
        </>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button
          disabled={chargement}
          onClick={() => lancerEncaissement("qr")}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "12px 0", borderRadius: 12, border: "none",
            background: chargement ? "#9CA3AF" : "#C75B39", color: "white",
            fontWeight: 600, fontSize: 14, cursor: chargement ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          <QrCode size={16} />
          {t("caisse_payer_qr")}
        </button>
        <button
          disabled={chargement}
          onClick={() => lancerEncaissement("especes")}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "12px 0", borderRadius: 12, border: "2px solid #C75B39",
            background: "white", color: "#C75B39",
            fontWeight: 600, fontSize: 14, cursor: chargement ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          <Banknote size={16} />
          {t("caisse_payer_especes")}
        </button>
      </div>
    </div>
  );
}
