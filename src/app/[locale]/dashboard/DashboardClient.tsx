"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { LayoutDashboard, ShoppingBag, CalendarDays, UtensilsCrossed, BarChart3, Clock, ChefHat, CheckCircle2 } from "lucide-react";

type Reservation = {
  id: string;
  date_reservation: string;
  heure: string;
  nb_personnes: number;
  statut: string;
  acompte_montant: number;
  created_at: string;
  clients: {
    nom: string;
    telephone: string;
  } | null;
};

type Commande = {
  id: string;
  type: string;
  heure_retrait_souhaitee: string;
  statut: string;
  montant_total: number;
  devise: string;
  created_at: string;
};

const statusColors: Record<string, string> = {
  en_attente: "#F59E0B",
  confirmee: "#22C55E",
  arrivee: "#3B82F6",
  annulee: "#EF4444",
  no_show: "#EF4444",
  recue: "#3B82F6",
  en_preparation: "#F59E0B",
  prete: "#A855F7",
  recuperee: "#22C55E",
};

const statusLabels: Record<string, Record<string, string>> = {
  fr: {
    en_attente: "En attente",
    confirmee: "Confirmee",
    arrivee: "Arrivee",
    annulee: "Annulee",
    no_show: "No show",
    recue: "Recue",
    en_preparation: "En preparation",
    prete: "Prete",
    recuperee: "Recuperee",
  },
  en: {
    en_attente: "Pending",
    confirmee: "Confirmed",
    arrivee: "Arrived",
    annulee: "Cancelled",
    no_show: "No show",
    recue: "Received",
    en_preparation: "Preparing",
    prete: "Ready",
    recuperee: "Picked up",
  },
  es: {
    en_attente: "Pendiente",
    confirmee: "Confirmada",
    arrivee: "Llegada",
    annulee: "Cancelada",
    no_show: "No show",
    recue: "Recibida",
    en_preparation: "Preparando",
    prete: "Lista",
    recuperee: "Recogida",
  },
  pt: {
    en_attente: "Pendente",
    confirmee: "Confirmada",
    arrivee: "Chegou",
    annulee: "Cancelada",
    no_show: "No show",
    recue: "Recebida",
    en_preparation: "Preparando",
    prete: "Pronta",
    recuperee: "Retirada",
  },
};

function getNavHref(key: string, locale: string): string {
  if (key === "nav_home") return `/${locale}`;
  if (key === "nav_restaurants") return `/${locale}/restaurants`;
  if (key === "nav_pricing") return `/${locale}/pricing`;
  if (key === "nav_dashboard") return `/${locale}/dashboard`;
  if (key === "nav_admin") return `/${locale}/admin`;
  return `/${locale}`;
}

function formatPrice(amount: number, devise: string): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + " " + devise;
}

export default function DashboardClient({ role }: { role: string }) {
  const estOwnerOuManager = role === "owner" || role === "manager";
  const t = useTranslations();
  const supabase = createClient();
  const [tab, setTab] = useState<"orders" | "reservations">("orders");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [locale, setLocale] = useState("fr");

  const navKeys = ["nav_home", "nav_restaurants", "nav_pricing", "nav_dashboard"];

  // Détecter la locale depuis l'URL
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/(fr|en|es|pt)/);
    if (match) setLocale(match[1]);
  }, []);

  // Charger les données initiales
  useEffect(() => {
    loadData();
  }, []);

  // Abonnement Realtime Supabase
  useEffect(() => {
    const channelRes = supabase
      .channel("commandes-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "commandes" },
        () => {
          loadData();
        }
      )
      .subscribe();

    const channelReserv = supabase
      .channel("reservations-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations" },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelRes);
      supabase.removeChannel(channelReserv);
    };
  }, []);

  async function loadData() {
    const { data: resData } = await supabase
      .from("reservations")
      .select("*, clients(nom, telephone)")
.order("created_at", { ascending: false })
.limit(50);

    if (resData) setReservations(resData as Reservation[]);

    const { data: cmdData } = await supabase
      .from("commandes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (cmdData) setCommandes(cmdData as Commande[]);
  }

  async function updateResStatus(id: string, newStatus: string) {
    await supabase
      .from("reservations")
      .update({ statut: newStatus })
      .eq("id", id);
    loadData();
  }

  async function updateCmdStatus(id: string, newStatus: string) {
    await supabase
      .from("commandes")
      .update({ statut: newStatus })
      .eq("id", id);
    loadData();
  }

  const activeReservations = reservations.filter(
    (r) => !["annulee", "arrivee", "no_show"].includes(r.statut)
  );
  const activeCommandes = commandes.filter(
    (c) => !["annulee", "recuperee"].includes(c.statut)
  );

  function getStatusLabel(status: string): string {
    return statusLabels[locale]?.[status] || statusLabels["fr"]?.[status] || status;
  }

  // Vue cuisine (KDS) — ecran simplifie pour tablette en cuisine.
  // Pas de sidebar, pas de reservations, pas de recette : juste la
  // file de commandes a preparer, en gros et tactile.
  // LIMITATION CONNUE : n'affiche pas encore le detail des plats par
  // commande (necessiterait de charger commande_items + menu_items,
  // pas encore fait dans loadData()) — a ameliorer ensuite.
  if (role === "cuisine") {
    return (
      <div style={{ minHeight: "100vh", background: "#1A1A2E", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ChefHat size={28} color="#E8A93B" />
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "white", fontFamily: "system-ui, sans-serif" }}>
              {t("dash_cuisine_title")}
            </h1>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "6px 14px",
            borderRadius: 20, fontSize: 13, fontWeight: 600,
            background: "rgba(34,197,94,0.15)", color: "#4ADE80",
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E" }} />
            {t("dash_live")}
          </div>
        </div>

        {activeCommandes.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 24px", color: "#9CA3AF" }}>
            <ChefHat size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
            <p style={{ fontSize: 18 }}>{t("dash_cuisine_vide")}</p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}>
            {activeCommandes.map((c) => (
              <div key={c.id} style={{
                background: "white", borderRadius: 16, padding: 20,
                borderLeft: `6px solid ${statusColors[c.statut] || "#9CA3AF"}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "system-ui, sans-serif" }}>
                    #{c.id.slice(0, 6).toUpperCase()}
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
                    background: `${statusColors[c.statut]}20`, color: statusColors[c.statut],
                  }}>
                    {getStatusLabel(c.statut)}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 4 }}>
                  {c.type === "retrait" ? t("dash_a_emporter") : t("dash_sur_place")}
                </p>
                {c.heure_retrait_souhaitee && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, fontSize: 13, color: "#374151" }}>
                    <Clock size={14} />
                    {new Date(c.heure_retrait_souhaitee).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}
                {c.statut === "recue" && (
                  <button
                    onClick={() => updateCmdStatus(c.id, "en_preparation")}
                    style={{
                      width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
                      background: "#C75B39", color: "white", fontWeight: 700, fontSize: 15,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {t("dash_lancer_preparation")}
                  </button>
                )}
                {c.statut === "en_preparation" && (
                  <button
                    onClick={() => updateCmdStatus(c.id, "prete")}
                    style={{
                      width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
                      background: "#22C55E", color: "white", fontWeight: 700, fontSize: 15,
                      cursor: "pointer", fontFamily: "inherit",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                  >
                    <CheckCircle2 size={18} />
                    {t("dash_marquer_prete")}
                  </button>
                )}
                {c.statut === "prete" && (
                  <div style={{
                    textAlign: "center", padding: "12px 0", borderRadius: 12,
                    background: "#EAF3DE", color: "#3B6D11", fontWeight: 700, fontSize: 14,
                  }}>
                    {t("dash_prete_attente_client")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FDF8F0" }}>
      {/* Header */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid #E5E1D8",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 64,
          }}
        >
          <a
            href={`/${locale}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "#C75B39",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 700,
                fontSize: 18,
              }}
            >
              R
            </div>
            <span
              style={{ fontWeight: 700, fontSize: 18, color: "#C75B39" }}
            >
              ReservDine
            </span>
          </a>
          <nav style={{ display: "flex", gap: 4 }}>
            {navKeys.map((key) => (
              <a
                key={key}
                href={getNavHref(key, locale)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 500,
                  color: key === "nav_dashboard" ? "#C75B39" : "#6B7280",
                  background:
                    key === "nav_dashboard"
                      ? "rgba(199,91,57,0.06)"
                      : "transparent",
                  textDecoration: "none",
                }}
              >
                {t(key)}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ paddingTop: 96, paddingLeft: 24, paddingRight: 24, paddingBottom: 32 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 24, alignItems: "flex-start" }}>
          {/* Sidebar navigation */}
          <aside style={{
            width: 200, flexShrink: 0,
            background: "#26221C", borderRadius: 16, padding: "16px 12px",
            position: "sticky", top: 96,
          }}>
            <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                borderRadius: 10, background: "#C75B39",
              }}>
                <LayoutDashboard size={16} color="#FBF3E7" />
                <span style={{ fontSize: 13, color: "#FBF3E7" }}>{t("dash_title")}</span>
              </div>
              <button
                onClick={() => setTab("orders")}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  borderRadius: 10, background: "transparent", border: "none",
                  cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                }}
              >
                <ShoppingBag size={16} color="#B8B0A6" />
                <span style={{ fontSize: 13, color: "#B8B0A6" }}>{t("dash_orders")}</span>
              </button>
              <button
                onClick={() => setTab("reservations")}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  borderRadius: 10, background: "transparent", border: "none",
                  cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                }}
              >
                <CalendarDays size={16} color="#B8B0A6" />
                <span style={{ fontSize: 13, color: "#B8B0A6" }}>{t("dash_reservations")}</span>
              </button>
              {estOwnerOuManager && (
                <>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 12px",
                    borderRadius: 10, opacity: 0.55, cursor: "not-allowed",
                  }} title={t("dash_bientot")}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <UtensilsCrossed size={16} color="#B8B0A6" />
                      <span style={{ fontSize: 13, color: "#B8B0A6" }}>{t("dash_menu")}</span>
                    </div>
                    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 20, background: "rgba(255,255,255,0.1)", color: "#B8B0A6", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {t("dash_bientot")}
                    </span>
                  </div>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 12px",
                    borderRadius: 10, opacity: 0.55, cursor: "not-allowed",
                  }} title={t("dash_bientot")}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <BarChart3 size={16} color="#B8B0A6" />
                      <span style={{ fontSize: 13, color: "#B8B0A6" }}>{t("dash_stats")}</span>
                    </div>
                    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 20, background: "rgba(255,255,255,0.1)", color: "#B8B0A6", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {t("dash_bientot")}
                    </span>
                  </div>
                </>
              )}
            </nav>
          </aside>

          <div style={{ flex: 1, minWidth: 0 }}>
          {/* Titre */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 32,
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div>
              <h1
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: 28,
                  fontWeight: 800,
                  marginBottom: 4,
                  color: "#1A1A2E",
                }}
              >
                {t("dash_title")}
              </h1>
              <p style={{ fontSize: 14, color: "#6B7280" }}>
                Mon Resto Pilote — Abidjan, CI
              </p>
              <span style={{
                display: "inline-block", marginTop: 6, fontSize: 11, fontWeight: 700,
                padding: "3px 10px", borderRadius: 20, textTransform: "uppercase",
                letterSpacing: 0.5,
                background: role === "owner" ? "#FAEEDA" : role === "manager" ? "#EFF6FF" : "#F3F4F6",
                color: role === "owner" ? "#854F0B" : role === "manager" ? "#1D4ED8" : "#4B5563",
              }}>
                {t(`dash_role_${role}`)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                background: "rgba(34,197,94,0.1)",
                color: "#16a34a",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#22C55E",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    inset: -3,
                    borderRadius: "50%",
                    background: "#22C55E",
                    animation: "pulse 1.5s infinite",
                    opacity: 0.4,
                  }}
                />
              </span>
              {t("dash_live")}
            </div>
          </div>

          {/* Cartes statistiques - donnees reelles */}
          {(() => {
            const aujourdhui = new Date().toISOString().slice(0, 10);
            const recetteDuJour = commandes
              .filter((c) => c.created_at.slice(0, 10) === aujourdhui)
              .reduce((acc, c) => acc + Number(c.montant_total || 0), 0);

            const stats = [
              { label: t("dash_stat_commandes"), valeur: activeCommandes.length, bg: "#FAECE7", couleur: "#993C1D" },
              { label: t("dash_stat_reservations"), valeur: activeReservations.length, bg: "#FAEEDA", couleur: "#854F0B" },
              { label: t("dash_stat_recette"), valeur: `${recetteDuJour.toLocaleString(locale)} FCFA`, bg: "#EAF3DE", couleur: "#3B6D11" },
            ];

            return (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
                marginBottom: 24,
              }}>
                {stats.map((s) => (
                  <div key={s.label} style={{
                    background: s.bg, borderRadius: 12, padding: "16px 18px",
                    boxShadow: "0 2px 8px rgba(38,34,28,0.05)",
                  }}>
                    <p style={{ fontSize: 12, color: s.couleur, margin: "0 0 6px", fontWeight: 500 }}>
                      {s.label}
                    </p>
                    <p style={{ fontSize: 22, fontWeight: 700, color: "#1A1A2E", margin: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>
                      {s.valeur}
                    </p>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Tendance 7 derniers jours - donnees reelles issues des commandes chargees */}
          {(() => {
            const jours: { label: string; total: number }[] = [];
            const maintenant = new Date();
            for (let i = 6; i >= 0; i--) {
              const jour = new Date(maintenant);
              jour.setDate(jour.getDate() - i);
              const jourStr = jour.toISOString().slice(0, 10);
              const total = commandes
                .filter((c) => c.created_at.slice(0, 10) === jourStr)
                .reduce((acc, c) => acc + Number(c.montant_total || 0), 0);
              jours.push({
                label: jour.toLocaleDateString(locale, { weekday: "short" }),
                total,
              });
            }
            const maxTotal = Math.max(...jours.map((j) => j.total), 1);
            const largeur = 640;
            const hauteur = 90;
            const step = largeur / (jours.length - 1);
            const points = jours
              .map((j, i) => {
                const x = i * step;
                const y = hauteur - (j.total / maxTotal) * (hauteur - 10);
                return `${x},${y}`;
              })
              .join(" ");
            const totalSemaine = jours.reduce((acc, j) => acc + j.total, 0);

            return (
              <div
                style={{
                  background: "white",
                  border: "1px solid #E5E1D8",
                  borderRadius: 12,
                  padding: "16px 20px",
                  marginBottom: 24,
                  boxShadow: "0 2px 8px rgba(38,34,28,0.05)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "#6B7280", margin: 0 }}>
                    {t("dash_tendance_semaine")}
                  </p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#1A1A2E", margin: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>
                    {totalSemaine.toLocaleString(locale)} FCFA
                  </p>
                </div>
                <svg viewBox={`0 0 ${largeur} ${hauteur}`} style={{ width: "100%", height: 90 }}>
                  <polyline
                    points={points}
                    fill="none"
                    stroke="#C75B39"
                    strokeWidth="2"
                  />
                  {jours.map((j, i) => {
                    const x = i * step;
                    const y = hauteur - (j.total / maxTotal) * (hauteur - 10);
                    return <circle key={i} cx={x} cy={y} r="3" fill="#C75B39" />;
                  })}
                </svg>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  {jours.map((j, i) => (
                    <span key={i} style={{ fontSize: 11, color: "#6B7280" }}>{j.label}</span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Onglets */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid #E5E1D8",
              marginBottom: 24,
            }}
          >
            <button
              onClick={() => setTab("orders")}
              style={{
                padding: "10px 20px",
                border: "none",
                background: "none",
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: 500,
                color: tab === "orders" ? "#C75B39" : "#6B7280",
                borderBottom:
                  tab === "orders" ? "2px solid #C75B39" : "2px solid transparent",
                cursor: "pointer",
              }}
            >
              {t("dash_orders")}
              {activeCommandes.length > 0 && (
                <span
                  style={{
                    marginLeft: 8,
                    padding: "2px 8px",
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 700,
                    background: "#C75B39",
                    color: "white",
                  }}
                >
                  {activeCommandes.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("reservations")}
              style={{
                padding: "10px 20px",
                border: "none",
                background: "none",
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: 500,
                color: tab === "reservations" ? "#C75B39" : "#6B7280",
                borderBottom:
                  tab === "reservations"
                    ? "2px solid #C75B39"
                    : "2px solid transparent",
                cursor: "pointer",
              }}
            >
              {t("dash_reservations")}
              {activeReservations.length > 0 && (
                <span
                  style={{
                    marginLeft: 8,
                    padding: "2px 8px",
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 700,
                    background: "#E8A93B",
                    color: "#1A1A2E",
                  }}
                >
                  {activeReservations.length}
                </span>
              )}
            </button>
          </div>

          {/* Contenu */}
          {tab === "orders" ? (
            commandes.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 20px", color: "#6B7280" }}>
                <p style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>
                  {t("dash_no_ord")}
                </p>
                <p style={{ fontSize: 14 }}>
                  Les commandes apparaitront ici en temps reel via Supabase Realtime.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {commandes.map((cmd) => (
                  <div
                    key={cmd.id}
                    style={{
                      background: "white",
                      border: "1px solid #E5E1D8",
                      borderRadius: 16,
                      padding: 20,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 8,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: 12,
                              padding: "4px 8px",
                              borderRadius: 6,
                              background: "rgba(0,0,0,0.05)",
                            }}
                          >
                            #{cmd.id.slice(-6).toUpperCase()}
                          </span>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "4px 12px",
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: 600,
                              color: statusColors[cmd.statut] || "#6B7280",
                              background: `${statusColors[cmd.statut] || "#6B7280"}15`,
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: statusColors[cmd.statut],
                              }}
                            />
                            {getStatusLabel(cmd.statut)}
                          </span>
                          <span style={{ fontSize: 12, color: "#6B7280" }}>
                            {new Date(cmd.created_at).toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 16,
                            fontSize: 13,
                            color: "#6B7280",
                            flexWrap: "wrap",
                          }}
                        >
                          <span>
                            {cmd.type === "retrait"
                              ? t("order_type_retrait")
                              : t("order_type_sur_place")}
                          </span>
                          <span
                            style={{ opacity: 0.4 }}
                          >
                            |
                          </span>
                          <span style={{ fontWeight: 600, color: "#C75B39" }}>
                            {formatPrice(cmd.montant_total, cmd.devise)}
                          </span>
                          {cmd.heure_retrait_souhaitee && (
                            <>
                              <span style={{ opacity: 0.4 }}>|</span>
                              <span>
                                {t("order_time")}: {cmd.heure_retrait_souhaitee}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        {cmd.statut === "recue" && (
                          <button
                            onClick={() => updateCmdStatus(cmd.id, "en_preparation")}
                            style={{
                              padding: "8px 16px",
                              borderRadius: 10,
                              border: "none",
                              background: "#C75B39",
                              color: "white",
                              fontWeight: 600,
                              fontSize: 13,
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            {t("dash_start_prep")}
                          </button>
                        )}
                        {cmd.statut === "en_preparation" && (
                          <button
                            onClick={() => updateCmdStatus(cmd.id, "prete")}
                            style={{
                              padding: "8px 16px",
                              borderRadius: 10,
                              border: "none",
                              background: "#E8A93B",
                              color: "#1A1A2E",
                              fontWeight: 600,
                              fontSize: 13,
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            {t("dash_mark_ready")}
                          </button>
                        )}
                        {cmd.statut === "prete" && (
                          <button
                            onClick={() => updateCmdStatus(cmd.id, "recuperee")}
                            style={{
                              padding: "8px 16px",
                              borderRadius: 10,
                              border: "none",
                              background: "#C75B39",
                              color: "white",
                              fontWeight: 600,
                              fontSize: 13,
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            {t("dash_mark_picked")}
                          </button>
                        )}
                        {!["annulee", "recuperee"].includes(cmd.statut) && (
                          <button
                            onClick={() => updateCmdStatus(cmd.id, "annulee")}
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              border: "1px solid #E5E1D8",
                              background: "white",
                              color: "#991B1B",
                              cursor: "pointer",
                              fontSize: 14,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : // Tab reservations
          reservations.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 20px", color: "#6B7280" }}>
              <p style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>
                {t("dash_no_res")}
              </p>
              <p style={{ fontSize: 14 }}>
                Les reservations apparaitront ici en temps reel via Supabase Realtime.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {reservations.map((res) => (
                <div
                  key={res.id}
                  style={{
                    background: "white",
                    border: "1px solid #E5E1D8",
                    borderRadius: 16,
                    padding: 20,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 8,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: 12,
                            padding: "4px 8px",
                            borderRadius: 6,
                            background: "rgba(0,0,0,0.05)",
                          }}
                        >
                          #{res.id.slice(-6).toUpperCase()}
                        </span>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px 12px",
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                            color: statusColors[res.statut] || "#6B7280",
                            background: `${statusColors[res.statut] || "#6B7280"}15`,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: statusColors[res.statut],
                            }}
                          />
                          {getStatusLabel(res.statut)}
                        </span>
                        <span style={{ fontSize: 12, color: "#6B7280" }}>
                          {res.date_reservation} — {res.heure}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 16,
                          fontSize: 13,
                          color: "#6B7280",
                          flexWrap: "wrap",
                        }}
                      >
                        {res.clients?.nom && (
  <>
    <span style={{ opacity: 0.4 }}>|</span>
    <span>{res.clients.nom}</span>
  </>
)}
                        {res.acompte_montant > 0 && (
                          <>
                            <span style={{ opacity: 0.4 }}>|</span>
                            <span>
                              {t("res_confirm")}:{" "}
                              {formatPrice(res.acompte_montant, "XOF")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      {res.statut === "en_attente" && (
                        <button
                          onClick={() => updateResStatus(res.id, "confirmee")}
                          style={{
                            padding: "8px 16px",
                            borderRadius: 10,
                            border: "none",
                            background: "#C75B39",
                            color: "white",
                            fontWeight: 600,
                            fontSize: 13,
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          Confirmer
                        </button>
                      )}
                      {res.statut === "confirmee" && (
                        <button
                          onClick={() => updateResStatus(res.id, "arrivee")}
                          style={{
                            padding: "8px 16px",
                            borderRadius: 10,
                            border: "none",
                            background: "#E8A93B",
                            color: "#1A1A2E",
                            fontWeight: 600,
                            fontSize: 13,
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          {t("dash_mark_arrived")}
                        </button>
                      )}
                      {!["annulee", "arrivee"].includes(res.statut) && (
                        <button
                          onClick={() => updateResStatus(res.id, "annulee")}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            border: "1px solid #E5E1D8",
                            background: "white",
                            color: "#991B1B",
                            cursor: "pointer",
                            fontSize: 14,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      </main>
    </div>
  );
}