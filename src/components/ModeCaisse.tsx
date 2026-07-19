"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { QrCode, Banknote, CheckCircle2, ArrowLeft, Wallet, Receipt, Smartphone } from "lucide-react";

type TableOption = { id: string; nom: string; statut: string };
type CommandeOption = { id: string; montant_total: number; devise: string; type: string; created_at: string };
type Transaction = { id: string; montant: number; devise: string; provider: string; quandISO: string };
type Resume = {
  totalEncaisse: number;
  nombreTransactions: number;
  totalMobileMoney: number;
  totalEspeces: number;
  devise: string | null;
  dernieresTransactions: Transaction[];
};

const LABELS_PROVIDER: Record<string, string> = {
  especes: "Especes",
  cinetpay: "CinetPay",
  elyonpay: "ElyonPay",
};

const COULEURS_PROVIDER: Record<string, string> = {
  especes: "#6B7280",
  cinetpay: "#D97706",
  elyonpay: "#16A34A",
};

function tempsEcoule(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "a l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  return `il y a ${h} h`;
}

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
  const [methode, setMethode] = useState<"mobile_money" | "especes" | null>(null);
  const [fournisseur, setFournisseur] = useState<"cinetpay" | "elyonpay">("cinetpay");
  const [telephoneClient, setTelephoneClient] = useState("");
  const [resume, setResume] = useState<Resume | null>(null);

  const chargerResume = useCallback(() => {
    fetch(`/api/caisse/resume?restaurantId=${restaurantId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setResume(data))
      .catch(() => {});
  }, [restaurantId]);

  useEffect(() => {
    fetch(`/api/tables?restaurantId=${restaurantId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setTables(data.tables || []))
      .catch(() => {});

    fetch(`/api/commandes?restaurantId=${restaurantId}&actives=true`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setCommandesActives(data.commandes || []))
      .catch(() => {});

    chargerResume();
  }, [restaurantId, chargerResume]);

  // Sondage du statut pendant l'attente du paiement QR
  useEffect(() => {
    if (etape !== "qr" || !commandeEnCours) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/caisse?commandeId=${commandeEnCours}`);
      if (res.ok) {
        const data = await res.json();
        if (data.statut === "recuperee") {
          setEtape("succes");
          chargerResume();
          clearInterval(interval);
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [etape, commandeEnCours, chargerResume]);

  async function lancerEncaissement(methodePaiement: "qr" | "especes") {
    setErreur("");

    if (!commandeId && (!montant || Number(montant) <= 0)) {
      setErreur(t("caisse_montant_requis"));
      return;
    }

    if (methodePaiement === "qr" && fournisseur === "elyonpay" && !telephoneClient) {
      setErreur(t("caisse_telephone_requis"));
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
          fournisseur: methodePaiement === "qr" ? fournisseur : undefined,
          telephone: methodePaiement === "qr" && fournisseur === "elyonpay" ? telephoneClient : undefined,
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
        chargerResume();
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
    setMethode(null);
    setTelephoneClient("");
  }

  const kpis = resume
    ? [
        { icon: Wallet, iconBg: "#16A34A", label: "En caisse (aujourd'hui)", valeur: `${resume.totalEncaisse.toLocaleString()} ${resume.devise || ""}` },
        { icon: Receipt, iconBg: "#2563EB", label: "Transactions", valeur: resume.nombreTransactions },
        { icon: Smartphone, iconBg: "#D97706", label: "Mobile Money", valeur: `${resume.totalMobileMoney.toLocaleString()} ${resume.devise || ""}` },
        { icon: Banknote, iconBg: "#6B7280", label: "Especes", valeur: `${resume.totalEspeces.toLocaleString()} ${resume.devise || ""}` },
      ]
    : [];

  if (etape === "succes") {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px" }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%", background: "#DCFCE7",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px",
        }}>
          <CheckCircle2 size={32} color="#16A34A" />
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: "#1F2937" }}>{t("caisse_paiement_reussi")}</h3>
        <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 24 }}>
          {montantFinal.toLocaleString()} {t("caisse_encaisse")}
        </p>
        <button
          onClick={reinitialiser}
          style={{
            padding: "10px 24px", borderRadius: 10, border: "none",
            background: "#F59E0B", color: "#FFFFFF", fontWeight: 600,
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
          {qrImage ? t("caisse_scanner_qr") : t("caisse_notification_telephone")} — <strong style={{ color: "#1F2937" }}>{montantFinal.toLocaleString()} FCFA</strong>
        </p>
        {qrImage && (
          <img
            src={qrImage}
            alt="QR de paiement"
            style={{ width: 220, height: 220, margin: "0 auto", borderRadius: 12, border: "1px solid #E5E7EB" }}
          />
        )}
        <p style={{ fontSize: 13, color: "#6B7280", marginTop: 16 }}>
          {t("caisse_attente_paiement")}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Resume caisse du jour - donnees reelles */}
      {resume && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))", gap: 10, marginBottom: 20 }}>
          {kpis.map((k) => (
            <div key={k.label} style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, padding: 12, boxShadow: "0 1px 3px rgba(17,24,39,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: 7, background: k.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <k.icon size={12} color="white" />
                </div>
                <p style={{ fontSize: 10.5, color: "#6B7280", margin: 0 }}>{k.label}</p>
              </div>
              <p style={{ fontSize: 15, fontWeight: 800, color: "#1F2937", margin: 0, fontFamily: "system-ui, sans-serif" }}>
                {k.valeur}
              </p>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(240px, 0.8fr)", gap: 20, alignItems: "start" }}>
        {/* Formulaire */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 14, padding: 20 }}>
          {erreur && (
            <p style={{ fontSize: 13, color: "#DC2626", marginBottom: 12 }}>{erreur}</p>
          )}

          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#1F2937" }}>
            {t("caisse_table_optionnelle")}
          </label>
          <select
            value={tableId}
            onChange={(e) => setTableId(e.target.value)}
            style={{
              width: "100%", padding: "10px 12px", border: "1px solid #E5E7EB",
              borderRadius: 10, fontSize: 14, marginBottom: 16, background: "#FFFFFF", color: "#1F2937",
            }}
          >
            <option value="">{t("caisse_aucune_table")}</option>
            {tables.map((tb) => (
              <option key={tb.id} value={tb.id}>{tb.nom}</option>
            ))}
          </select>

          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#1F2937" }}>
            {t("caisse_commande_optionnelle")}
          </label>
          <select
            value={commandeId}
            onChange={(e) => setCommandeId(e.target.value)}
            style={{
              width: "100%", padding: "10px 12px", border: "1px solid #E5E7EB",
              borderRadius: 10, fontSize: 14, marginBottom: 16, background: "#FFFFFF", color: "#1F2937",
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
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#1F2937" }}>
                {t("caisse_montant")}
              </label>
              <input
                type="number"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                placeholder="10000"
                style={{
                  width: "100%", padding: "10px 12px", border: "1px solid #E5E7EB",
                  borderRadius: 10, fontSize: 14, marginBottom: 20, boxSizing: "border-box",
                  color: "#1F2937",
                }}
              />
            </>
          )}

          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#1F2937" }}>
            Mode de paiement
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <button
              onClick={() => setMethode("mobile_money")}
              style={{
                padding: "14px 12px", borderRadius: 12, textAlign: "left",
                border: methode === "mobile_money" ? "2px solid #2563EB" : "1px solid #E5E7EB",
                background: methode === "mobile_money" ? "#EFF6FF" : "#FFFFFF",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <QrCode size={18} color="#2563EB" style={{ marginBottom: 6 }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: "#1F2937", margin: 0 }}>Mobile Money</p>
              <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>Scanner pour payer</p>
            </button>
            <button
              onClick={() => setMethode("especes")}
              style={{
                padding: "14px 12px", borderRadius: 12, textAlign: "left",
                border: methode === "especes" ? "2px solid #6B7280" : "1px solid #E5E7EB",
                background: methode === "especes" ? "#F1F3F6" : "#FFFFFF",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <Banknote size={18} color="#6B7280" style={{ marginBottom: 6 }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: "#1F2937", margin: 0 }}>Especes</p>
              <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>Encaissement manuel</p>
            </button>
          </div>

          {methode === "mobile_money" && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button
                  onClick={() => setFournisseur("cinetpay")}
                  style={{
                    flex: 1, padding: "8px 0", borderRadius: 8,
                    border: fournisseur === "cinetpay" ? "2px solid #D97706" : "1px solid #E5E7EB",
                    background: fournisseur === "cinetpay" ? "#FEF3C7" : "#FFFFFF",
                    color: fournisseur === "cinetpay" ? "#D97706" : "#6B7280",
                    fontWeight: 600, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  CinetPay
                </button>
                <button
                  onClick={() => setFournisseur("elyonpay")}
                  style={{
                    flex: 1, padding: "8px 0", borderRadius: 8,
                    border: fournisseur === "elyonpay" ? "2px solid #16A34A" : "1px solid #E5E7EB",
                    background: fournisseur === "elyonpay" ? "#DCFCE7" : "#FFFFFF",
                    color: fournisseur === "elyonpay" ? "#16A34A" : "#6B7280",
                    fontWeight: 600, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  ElyonPay
                </button>
              </div>
              {fournisseur === "elyonpay" && (
                <input
                  type="tel"
                  value={telephoneClient}
                  onChange={(e) => setTelephoneClient(e.target.value)}
                  placeholder={t("caisse_telephone_client") as string}
                  style={{
                    width: "100%", padding: "10px 12px", border: "1px solid #E5E7EB",
                    borderRadius: 10, fontSize: 14, boxSizing: "border-box", color: "#1F2937",
                  }}
                />
              )}
            </div>
          )}

          <button
            disabled={chargement || !methode}
            onClick={() => lancerEncaissement(methode === "especes" ? "especes" : "qr")}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "14px 0", borderRadius: 12, border: "none",
              background: !methode ? "#D1D5DB" : chargement ? "#9CA3AF" : "#16A34A",
              color: "#FFFFFF", fontWeight: 700, fontSize: 15,
              cursor: !methode || chargement ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            <CheckCircle2 size={17} />
            {chargement ? "Encaissement..." : "Encaisser maintenant"}
          </button>
        </div>

        {/* Dernieres transactions - donnees reelles */}
        <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 14, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", margin: "0 0 12px" }}>Dernieres transactions</p>
          {resume && resume.dernieresTransactions.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 340, overflow: "auto" }}>
              {resume.dernieresTransactions.map((tr) => (
                <div key={tr.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                  padding: "8px 0", borderBottom: "1px solid #F1F3F6", fontSize: 12.5,
                }}>
                  <span style={{
                    padding: "2px 8px", borderRadius: 6, fontSize: 10.5, fontWeight: 700,
                    color: COULEURS_PROVIDER[tr.provider] || "#6B7280",
                    background: `${COULEURS_PROVIDER[tr.provider] || "#6B7280"}18`,
                  }}>
                    {LABELS_PROVIDER[tr.provider] || tr.provider}
                  </span>
                  <span style={{ color: "#1F2937", fontWeight: 600 }}>{Number(tr.montant).toLocaleString()} {tr.devise}</span>
                  <span style={{ color: "#6B7280", whiteSpace: "nowrap" }}>{tempsEcoule(tr.quandISO)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "#6B7280" }}>Aucune transaction aujourd'hui.</p>
          )}
        </div>
      </div>
    </div>
  );
}
