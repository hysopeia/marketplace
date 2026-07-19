"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { LayoutDashboard, ShoppingBag, CalendarDays, UtensilsCrossed, BarChart3, Clock, ChefHat, CheckCircle2, ThumbsUp, ThumbsDown, ArrowLeft, Users, Mail, LayoutGrid, Banknote, Gift, Bell, Star, Megaphone } from "lucide-react";
import AuthNav from "@/components/AuthNav";
import PlanDeSalle from "@/components/PlanDeSalle";
import ModeCaisse from "@/components/ModeCaisse";
import GestionMenu from "@/components/GestionMenu";
import Statistiques from "@/components/Statistiques";
import FideliteEtPromotions from "@/components/FideliteEtPromotions";
import Annonces from "@/components/Annonces";

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
  adresse_livraison?: string | null;
};

const statusColors: Record<string, string> = {
  en_attente: "#F59E0B",
  confirmee: "#16A34A",
  arrivee: "#2563EB",
  annulee: "#DC2626",
  no_show: "#DC2626",
  recue: "#2563EB",
  en_preparation: "#F59E0B",
  prete: "#9333EA",
  recuperee: "#16A34A",
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
  const [tab, setTab] = useState<"apercu" | "orders" | "reservations" | "plan" | "caisse" | "menu" | "stats" | "fidelite" | "annonces" | "equipe">("apercu");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [locale, setLocale] = useState("fr");
  const [avisStats, setAvisStats] = useState<{
    totalAvis: number;
    totalLikes: number;
    pourcentageSatisfaction: number | null;
    avis: any[];
  } | null>(null);
  const [monRestaurantId, setMonRestaurantId] = useState<string | null>(null);
  const [monRestaurantInfos, setMonRestaurantInfos] = useState<{ slug: string; pays: string; logo_url: string | null } | null>(null);
  const [temoignagePositif, setTemoignagePositif] = useState<boolean | null>(null);
  const [temoignageCommentaire, setTemoignageCommentaire] = useState("");
  const [temoignageLoading, setTemoignageLoading] = useState(false);
  const [temoignageSuccess, setTemoignageSuccess] = useState(false);
  const [notifOuvertes, setNotifOuvertes] = useState(false);
  const [dernierVu, setDernierVu] = useState<string>("");

  const [equipe, setEquipe] = useState<{ id: string; user_id: string; role: string; email: string }[]>([]);
  const [equipeEmail, setEquipeEmail] = useState("");
  const [equipeRole, setEquipeRole] = useState("staff");
  const [equipeLoading, setEquipeLoading] = useState(false);
  const [equipeError, setEquipeError] = useState("");
  const [equipeSuccess, setEquipeSuccess] = useState("");
  const [equipeMotDePasseGenere, setEquipeMotDePasseGenere] = useState<{ email: string; motDePasse: string } | null>(null);

  const navKeys = ["nav_home", "nav_restaurants", "nav_pricing", "nav_dashboard", "nav_admin", "nav_login"];

  // Détecter la locale depuis l'URL
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/(fr|en|es|pt)/);
    if (match) setLocale(match[1]);
  }, []);

  // Charger les données initiales
  useEffect(() => {
    loadData();
    loadAvisStats();
  }, []);

  async function loadAvisStats() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: acces } = await supabase
      .from("utilisateurs_restaurant")
      .select("restaurant_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!acces?.restaurant_id) return;
    setMonRestaurantId(acces.restaurant_id);

    const { data: infosResto } = await supabase
      .from("restaurants")
      .select("slug, pays, logo_url")
      .eq("id", acces.restaurant_id)
      .maybeSingle();
    if (infosResto) setMonRestaurantInfos(infosResto);

    try {
      const res = await fetch(`/api/avis?restaurantId=${acces.restaurant_id}`);
      if (res.ok) {
        const data = await res.json();
        setAvisStats(data);
      }
    } catch {
      // Echec silencieux — non bloquant pour le reste du dashboard.
    }
  }

  // Charge l'equipe des que le restaurant_id est connu (owner uniquement)
  useEffect(() => {
    if (role === "owner" && monRestaurantId) {
      loadEquipe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monRestaurantId, role]);

  // Charge la date de derniere consultation des notifications (par restaurant)
  useEffect(() => {
    if (!monRestaurantId) return;
    const sauvegarde = localStorage.getItem(`dashboard_notif_vu_${monRestaurantId}`);
    setDernierVu(sauvegarde || new Date(0).toISOString());
  }, [monRestaurantId]);

  // Fil d'activite recente : combine commandes, reservations et avis en une
  // seule liste chronologique, comme le fait TailAdmin sur son dashboard SaaS.
  const activiteRecente = useMemo(() => {
    const items: { id: string; type: string; texte: string; date: string }[] = [];

    for (const c of commandes) {
      items.push({
        id: `cmd-${c.id}`,
        type: "commande",
        texte: `${t("notif_nouvelle_commande")} — ${c.montant_total.toLocaleString()} ${c.devise}`,
        date: c.created_at,
      });
    }
    for (const r of reservations) {
      items.push({
        id: `res-${r.id}`,
        type: "reservation",
        texte: `${t("notif_nouvelle_reservation")} — ${r.nb_personnes} ${t("notif_personnes")}`,
        date: r.created_at,
      });
    }
    if (avisStats?.avis) {
      for (const a of avisStats.avis) {
        items.push({
          id: `avis-${a.id}`,
          type: "avis",
          texte: a.positif ? t("notif_nouvel_avis_positif") : t("notif_nouvel_avis_negatif"),
          date: a.created_at,
        });
      }
    }

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15);
  }, [commandes, reservations, avisStats, t]);

  const notifNonLues = useMemo(() => {
    return activiteRecente.filter((item) => new Date(item.date).getTime() > new Date(dernierVu).getTime()).length;
  }, [activiteRecente, dernierVu]);

  function ouvrirNotifications() {
    setNotifOuvertes(!notifOuvertes);
    if (!notifOuvertes && monRestaurantId) {
      const maintenant = new Date().toISOString();
      localStorage.setItem(`dashboard_notif_vu_${monRestaurantId}`, maintenant);
      setDernierVu(maintenant);
    }
  }

  function tempsRelatif(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return t("notif_a_linstant");
    if (minutes < 60) return `${t("notif_il_y_a")} ${minutes} min`;
    const heures = Math.floor(minutes / 60);
    if (heures < 24) return `${t("notif_il_y_a")} ${heures}h`;
    const jours = Math.floor(heures / 24);
    return `${t("notif_il_y_a")} ${jours}j`;
  }

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
    // Mise a jour optimiste : l'interface change immediatement, sans
    // attendre la reponse reseau — corrige la sensation de delai au clic.
    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, statut: newStatus } : r))
    );
    const { error } = await supabase
      .from("reservations")
      .update({ statut: newStatus })
      .eq("id", id);
    if (error) loadData(); // en cas d'echec, on resynchronise avec la vraie donnee
  }

  async function updateCmdStatus(id: string, newStatus: string) {
    setCommandes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, statut: newStatus } : c))
    );
    const { error } = await supabase
      .from("commandes")
      .update({ statut: newStatus })
      .eq("id", id);
    if (error) loadData();
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

  async function handleSubmitTemoignage() {
    if (temoignagePositif === null || !monRestaurantId) return;

    setTemoignageLoading(true);
    try {
      const res = await fetch("/api/avis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: monRestaurantId,
          auteurType: "proprietaire",
          positif: temoignagePositif,
          commentaire: temoignageCommentaire || null,
        }),
      });
      if (res.ok) {
        setTemoignageSuccess(true);
      }
    } catch {
      // Echec silencieux, non bloquant.
    }
    setTemoignageLoading(false);
  }

  async function loadEquipe() {
    if (!monRestaurantId) return;
    try {
      const res = await fetch(`/api/staff?restaurantId=${monRestaurantId}`);
      if (res.ok) {
        const data = await res.json();
        setEquipe(data.membres || []);
      }
    } catch {
      // Echec silencieux
    }
  }

  async function handleInviterStaff() {
    setEquipeError("");
    setEquipeSuccess("");

    if (!equipeEmail || !monRestaurantId) {
      setEquipeError(t("champs_requis"));
      return;
    }

    setEquipeLoading(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: monRestaurantId,
          email: equipeEmail,
          role: equipeRole,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setEquipeError(data.error || t("erreur_generique"));
        setEquipeLoading(false);
        return;
      }

      setEquipeSuccess(t("equipe_invitation_envoyee"));
      setEquipeMotDePasseGenere({ email: data.email, motDePasse: data.motDePasse });
      setEquipeEmail("");
      loadEquipe();
    } catch {
      setEquipeError(t("erreur_generique"));
    }
    setEquipeLoading(false);
  }

  async function handleRetirerStaff(id: string) {
    if (!monRestaurantId) return;
    await fetch(`/api/staff?id=${id}&restaurantId=${monRestaurantId}`, {
      method: "DELETE",
    });
    loadEquipe();
  }

  async function handleModifierRole(id: string, nouveauRole: string) {
    if (!monRestaurantId) return;
    await fetch("/api/staff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, restaurantId: monRestaurantId, role: nouveauRole }),
    });
    loadEquipe();
  }

  // Vue cuisine (KDS) — ecran simplifie pour tablette en cuisine.
  // Pas de sidebar, pas de reservations, pas de recette : juste la
  // file de commandes a preparer, en gros et tactile.
  // LIMITATION CONNUE : n'affiche pas encore le detail des plats par
  // commande (necessiterait de charger commande_items + menu_items,
  // pas encore fait dans loadData()) — a ameliorer ensuite.
  if (role === "cuisine") {
    return (
      <div style={{ minHeight: "100vh", background: "#1F2937", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ChefHat size={28} color="#0F8B4C" />
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1F2937", fontFamily: "system-ui, sans-serif" }}>
              {t("dash_cuisine_title")}
            </h1>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "6px 14px",
            borderRadius: 20, fontSize: 13, fontWeight: 600,
            background: "rgba(34,197,94,0.15)", color: "#16A34A",
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#16A34A" }} />
            {t("dash_live")}
          </div>
        </div>

        {activeCommandes.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 24px", color: "#6B7280" }}>
            <ChefHat size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
            <p style={{ fontSize: 18 }}>{t("dash_cuisine_vide")}</p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
            gap: 16,
          }}>
            {activeCommandes.map((c) => (
              <div key={c.id} style={{
                background: "#FFFFFF", borderRadius: 16, padding: 20,
                borderLeft: `6px solid ${statusColors[c.statut] || "#6B7280"}`,
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
                  {c.type === "retrait" ? t("dash_a_emporter") : c.type === "livraison" ? t("dash_livraison") : t("dash_sur_place")}
                </p>
                {c.type === "livraison" && c.adresse_livraison && (
                  <p style={{ fontSize: 13, color: "#DC2626", fontWeight: 600, marginBottom: 8 }}>
                    📍 {c.adresse_livraison}
                  </p>
                )}
                {c.heure_retrait_souhaitee && !isNaN(new Date(c.heure_retrait_souhaitee).getTime()) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, fontSize: 13, color: "#1F2937" }}>
                    <Clock size={14} />
                    {new Date(c.heure_retrait_souhaitee).toLocaleDateString(locale, { day: "2-digit", month: "2-digit" })}
                    {" — "}
                    {new Date(c.heure_retrait_souhaitee).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}
                {c.statut === "recue" && (
                  <button
                    onClick={() => updateCmdStatus(c.id, "en_preparation")}
                    style={{
                      width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
                      background: "#F59E0B", color: "#1F2937", fontWeight: 700, fontSize: 15,
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
                      background: "#16A34A", color: "#FFFFFF", fontWeight: 700, fontSize: 15,
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
                    background: "#E5E7EB", color: "#16A34A", fontWeight: 700, fontSize: 14,
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
    <div style={{ minHeight: "100vh", background: "#F4F6F8" }}>
      {/* Header */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid #E5E7EB",
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
            gap: 12,
          }}
        >
          <a
            href={`/${locale}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <img
              src="/images/logo-afritable.png"
              alt="AfriTable"
              style={{ width: 36, height: 36, borderRadius: 10 }}
            />
            <span
              style={{ fontWeight: 700, fontSize: 18, color: "#1F2937" }}
            >
              AfriTable
            </span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <button
                onClick={ouvrirNotifications}
                style={{
                  position: "relative", background: "none", border: "none",
                  cursor: "pointer", padding: 8, borderRadius: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Bell size={20} color="#6B7280" />
                {notifNonLues > 0 && (
                  <span style={{
                    position: "absolute", top: 2, right: 2,
                    background: "#DC2626", color: "#FFFFFF", borderRadius: "50%",
                    fontSize: 10, fontWeight: 700, minWidth: 16, height: 16,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 3px",
                  }}>
                    {notifNonLues > 9 ? "9+" : notifNonLues}
                  </span>
                )}
              </button>
              {notifOuvertes && (
                <div style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0,
                  width: 320, maxHeight: 420, overflowY: "auto",
                  background: "#FFFFFF", borderRadius: 14, boxShadow: "0 8px 30px rgba(31,41,55,0.15)",
                  border: "1px solid #E5E7EB", zIndex: 50,
                }}>
                  <div style={{ padding: "14px 16px", borderBottom: "1px solid #E5E7EB" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{t("notif_titre")}</p>
                  </div>
                  {activiteRecente.length === 0 ? (
                    <p style={{ padding: 20, fontSize: 13, color: "#6B7280", textAlign: "center" }}>
                      {t("notif_vide")}
                    </p>
                  ) : (
                    activiteRecente.map((item) => {
                      const Icone = item.type === "commande" ? ShoppingBag : item.type === "reservation" ? CalendarDays : Star;
                      const couleur = item.type === "commande" ? "#F59E0B" : item.type === "reservation" ? "#0F8B4C" : "#2563EB";
                      return (
                        <div key={item.id} style={{
                          display: "flex", gap: 10, padding: "12px 16px",
                          borderBottom: "1px solid #F1F3F6",
                        }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                            background: `${couleur}15`, display: "flex",
                            alignItems: "center", justifyContent: "center",
                          }}>
                            <Icone size={15} color={couleur} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12.5, margin: 0, color: "#1F2937" }}>{item.texte}</p>
                            <p style={{ fontSize: 11, margin: "2px 0 0", color: "#6B7280" }}>{tempsRelatif(item.date)}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            <AuthNav navKeys={navKeys} locale={locale} activeKey="nav_dashboard" theme="clair" />
          </div>
        </div>
      </header>

      <main style={{ paddingTop: 96, paddingLeft: 24, paddingRight: 24, paddingBottom: 32 }}>
        <div className="dashboard-layout" style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 24, alignItems: "flex-start" }}>
          {/* Sidebar navigation */}
          <aside className="dashboard-sidebar" style={{
            width: 240, flexShrink: 0,
            background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 16, padding: "16px 12px",
            position: "sticky", top: 96,
          }}>
            <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <button
                onClick={() => setTab("apercu")}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  borderRadius: 10, background: tab === "apercu" ? "#F59E0B" : "transparent",
                  border: "none", marginBottom: 4, width: "100%",
                  cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                }}
              >
                <LayoutDashboard size={16} color={tab === "apercu" ? "#1F2937" : "#6B7280"} />
                <span style={{ fontSize: 13, color: tab === "apercu" ? "#1F2937" : "#6B7280", fontWeight: tab === "apercu" ? 600 : 400 }}>{t("dash_title")}</span>
              </button>
              <button
                onClick={() => setTab("orders")}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  borderRadius: 10, background: tab === "orders" ? "#F59E0B" : "transparent",
                  border: "none",
                  cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                }}
              >
                <ShoppingBag size={16} color={tab === "orders" ? "#1F2937" : "#6B7280"} />
                <span style={{ fontSize: 13, color: tab === "orders" ? "#1F2937" : "#6B7280" }}>{t("dash_orders")}</span>
              </button>
              <button
                onClick={() => setTab("reservations")}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                  borderRadius: 10, background: tab === "reservations" ? "#F59E0B" : "transparent",
                  border: "none",
                  cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                }}
              >
                <CalendarDays size={16} color={tab === "reservations" ? "#1F2937" : "#6B7280"} />
                <span style={{ fontSize: 13, color: tab === "reservations" ? "#1F2937" : "#6B7280" }}>{t("dash_reservations")}</span>
              </button>
              {role !== "cuisine" && (
                <button
                  onClick={() => setTab("plan")}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                    borderRadius: 10, background: tab === "plan" ? "#F59E0B" : "transparent",
                    border: "none",
                    cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                  }}
                >
                  <LayoutGrid size={16} color={tab === "plan" ? "#1F2937" : "#6B7280"} />
                  <span style={{ fontSize: 13, color: tab === "plan" ? "#1F2937" : "#6B7280" }}>{t("dash_plan_salle")}</span>
                </button>
              )}
              {role !== "cuisine" && (
                <button
                  onClick={() => setTab("caisse")}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                    borderRadius: 10, background: tab === "caisse" ? "#F59E0B" : "transparent",
                    border: "none",
                    cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                  }}
                >
                  <Banknote size={16} color={tab === "caisse" ? "#1F2937" : "#6B7280"} />
                  <span style={{ fontSize: 13, color: tab === "caisse" ? "#1F2937" : "#6B7280" }}>{t("dash_caisse")}</span>
                </button>
              )}
              {estOwnerOuManager && (
                <>
                  <button
                    onClick={() => setTab("menu")}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                      borderRadius: 10, background: tab === "menu" ? "#F59E0B" : "transparent",
                      border: "none",
                      cursor: "pointer", textAlign: "left", fontFamily: "inherit", width: "100%",
                    }}
                  >
                    <UtensilsCrossed size={16} color={tab === "menu" ? "#1F2937" : "#6B7280"} />
                    <span style={{ fontSize: 13, color: tab === "menu" ? "#1F2937" : "#6B7280" }}>{t("dash_menu")}</span>
                  </button>
                  <button
                    onClick={() => setTab("stats")}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                      borderRadius: 10, background: tab === "stats" ? "#F59E0B" : "transparent",
                      border: "none",
                      cursor: "pointer", textAlign: "left", fontFamily: "inherit", width: "100%",
                    }}
                  >
                    <BarChart3 size={16} color={tab === "stats" ? "#1F2937" : "#6B7280"} />
                    <span style={{ fontSize: 13, color: tab === "stats" ? "#1F2937" : "#6B7280" }}>{t("dash_stats")}</span>
                  </button>
                  <button
                    onClick={() => setTab("fidelite")}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                      borderRadius: 10, background: tab === "fidelite" ? "#F59E0B" : "transparent",
                      border: "none",
                      cursor: "pointer", textAlign: "left", fontFamily: "inherit", width: "100%",
                    }}
                  >
                    <Gift size={16} color={tab === "fidelite" ? "#1F2937" : "#6B7280"} />
                    <span style={{ fontSize: 13, color: tab === "fidelite" ? "#1F2937" : "#6B7280" }}>{t("dash_fidelite")}</span>
                  </button>
                  <button
                    onClick={() => setTab("annonces")}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                      borderRadius: 10, background: tab === "annonces" ? "#F59E0B" : "transparent",
                      border: "none",
                      cursor: "pointer", textAlign: "left", fontFamily: "inherit", width: "100%",
                    }}
                  >
                    <Megaphone size={16} color={tab === "annonces" ? "#1F2937" : "#6B7280"} />
                    <span style={{ fontSize: 13, color: tab === "annonces" ? "#1F2937" : "#6B7280" }}>Annonces</span>
                  </button>
                  {role === "owner" && (
                    <button
                      onClick={() => setTab("equipe")}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                        borderRadius: 10, background: tab === "equipe" ? "#F59E0B" : "transparent",
                        border: "none",
                        cursor: "pointer", textAlign: "left", fontFamily: "inherit", width: "100%",
                      }}
                    >
                      <Users size={16} color={tab === "equipe" ? "#1F2937" : "#6B7280"} />
                      <span style={{ fontSize: 13, color: tab === "equipe" ? "#1F2937" : "#6B7280" }}>{t("equipe_titre")}</span>
                    </button>
                  )}
                </>
              )}
            </nav>
          </aside>

          <div style={{ flex: 1, minWidth: 0 }}>
          {tab !== "apercu" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <a
                  href={`/${locale}`}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    fontSize: 13, color: "#6B7280", textDecoration: "none", marginBottom: 6,
                  }}
                >
                  <ArrowLeft size={14} />
                  {t("retour_accueil")}
                </a>
                <h1 style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 800, color: "#1F2937", margin: 0 }}>
                  {tab === "annonces" ? "Annonces" : tab === "equipe" ? t("equipe_titre") : t(`dash_${tab === "orders" ? "orders" : tab === "reservations" ? "reservations" : tab === "plan" ? "plan_salle" : tab === "caisse" ? "caisse" : tab === "menu" ? "menu" : tab === "stats" ? "stats" : tab === "fidelite" ? "fidelite" : "title"}`)}
                </h1>
              </div>
            </div>
          )}
          {tab === "apercu" && (
          <>
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
              <a
                href={`/${locale}`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontSize: 13, color: "#6B7280", textDecoration: "none",
                  marginBottom: 10,
                }}
              >
                <ArrowLeft size={14} />
                {t("retour_accueil")}
              </a>
              <h1
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: 28,
                  fontWeight: 800,
                  marginBottom: 4,
                  color: "#1F2937",
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
                background: role === "owner" ? "#FEF3C7" : role === "manager" ? "#DBEAFE" : "#F1F3F6",
                color: role === "owner" ? "#D97706" : role === "manager" ? "#2563EB" : "#6B7280",
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
                color: "#16A34A",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#16A34A",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    inset: -3,
                    borderRadius: "50%",
                    background: "#16A34A",
                    animation: "pulse 1.5s infinite",
                    opacity: 0.4,
                  }}
                />
              </span>
              {t("dash_live")}
            </div>
          </div>

          {/* Cartes KPI - meme style que le dashboard admin (icone coloree + sparkline reelle) */}
          {estOwnerOuManager && (() => {
            const aujourdhui = new Date().toISOString().slice(0, 10);
            const recetteDuJour = commandes
              .filter((c) => c.created_at.slice(0, 10) === aujourdhui)
              .reduce((acc, c) => acc + Number(c.montant_total || 0), 0);

            const jours7: string[] = [];
            const maintenant = new Date();
            for (let i = 6; i >= 0; i--) {
              const jour = new Date(maintenant);
              jour.setDate(jour.getDate() - i);
              jours7.push(jour.toISOString().slice(0, 10));
            }
            const commandesParJour7 = jours7.map(
              (j) => commandes.filter((c) => c.created_at.slice(0, 10) === j).length
            );
            const recetteParJour7 = jours7.map((j) =>
              commandes
                .filter((c) => c.created_at.slice(0, 10) === j)
                .reduce((acc, c) => acc + Number(c.montant_total || 0), 0)
            );

            const kpis = [
              { icon: ShoppingBag, iconBg: "#EA580C", label: t("dash_stat_commandes"), valeur: activeCommandes.length, sparkline: commandesParJour7 },
              { icon: CalendarDays, iconBg: "#D97706", label: t("dash_stat_reservations"), valeur: activeReservations.length },
              { icon: Banknote, iconBg: "#16A34A", label: t("dash_stat_recette"), valeur: `${recetteDuJour.toLocaleString(locale)} FCFA`, sparkline: recetteParJour7 },
            ];

            return (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(170px, 100%), 1fr))",
                gap: 10,
                marginBottom: 14,
              }}>
                {kpis.map((k) => (
                  <div key={k.label} style={{
                    background: "#FFFFFF", borderRadius: 12, padding: 12,
                    boxShadow: "0 1px 3px rgba(17,24,39,0.08)", border: "1px solid #E5E7EB",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 8, background: k.iconBg, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <k.icon size={13} color="white" />
                      </div>
                      <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>{k.label}</p>
                    </div>
                    <p style={{ fontSize: 16, fontWeight: 800, fontFamily: "system-ui, sans-serif", color: "#1F2937", margin: 0 }}>
                      {k.valeur}
                    </p>
                    {k.sparkline && k.sparkline.length > 1 && (
                      <svg viewBox="0 0 100 28" style={{ width: "100%", height: 28, marginTop: 6 }} preserveAspectRatio="none">
                        <polyline
                          points={(() => {
                            const maxVal = Math.max(...k.sparkline, 1);
                            const step = 100 / (k.sparkline.length - 1);
                            return k.sparkline.map((v, i) => `${(i * step).toFixed(1)},${(26 - (v / maxVal) * 26).toFixed(1)}`).join(" ");
                          })()}
                          fill="none" stroke={k.iconBg} strokeWidth={2}
                        />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Rangee 1 : Tendance CA | Commandes par statut | Activite recente */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 1.2fr) minmax(220px, 1fr) minmax(220px, 1fr)", gap: 14, marginBottom: 14 }}>
{/* Tendance 7 derniers jours - donnees reelles issues des commandes chargees, owner/manager uniquement */}
          {estOwnerOuManager && (() => {
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
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: 12,
                  padding: "16px 20px",
                  boxShadow: "0 2px 8px rgba(31,41,55,0.05)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: "#6B7280", margin: 0 }}>
                    {t("dash_tendance_semaine")}
                  </p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#1F2937", margin: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>
                    {totalSemaine.toLocaleString(locale)} FCFA
                  </p>
                </div>
                <svg viewBox={`0 0 ${largeur} ${hauteur}`} style={{ width: "100%", height: 90 }}>
                  <polyline
                    points={points}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="2"
                  />
                  {jours.map((j, i) => {
                    const x = i * step;
                    const y = hauteur - (j.total / maxTotal) * (hauteur - 10);
                    return <circle key={i} cx={x} cy={y} r="3" fill="#F59E0B" />;
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

{/* Commandes par statut, owner/manager uniquement */}
          {estOwnerOuManager && (() => {
            const parStatut: Record<string, number> = {};
            for (const c of commandes) {
              parStatut[c.statut] = (parStatut[c.statut] || 0) + 1;
            }
            const totalStatut = Object.values(parStatut).reduce((s, n) => s + n, 0) || 1;
            let angleCumule = 0;
            const segments = Object.entries(parStatut).map(([statut, count]) => {
              const part = count / totalStatut;
              const debut = angleCumule;
              angleCumule += part;
              return { statut, count, debut, fin: angleCumule, part };
            });
            function pointCercleDonut(fraction: number, rayon: number): [number, number] {
              const angle = fraction * 2 * Math.PI - Math.PI / 2;
              return [50 + rayon * Math.cos(angle), 50 + rayon * Math.sin(angle)];
            }

            return (
              <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, padding: "16px 20px", boxShadow: "0 2px 8px rgba(31,41,55,0.05)" }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", margin: "0 0 12px" }}>Commandes par statut</p>
                {segments.length > 0 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <svg viewBox="0 0 100 100" style={{ width: 72, height: 72, flexShrink: 0 }}>
                      {segments.map((s) => {
                        const [x1, y1] = pointCercleDonut(s.debut, 40);
                        const [x2, y2] = pointCercleDonut(s.fin, 40);
                        const grandArc = s.part > 0.5 ? 1 : 0;
                        return (
                          <path
                            key={s.statut}
                            d={`M 50,50 L ${x1.toFixed(2)},${y1.toFixed(2)} A 40,40 0 ${grandArc} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`}
                            fill={statusColors[s.statut] || "#6B7280"}
                          />
                        );
                      })}
                      <circle cx={50} cy={50} r={22} fill="#FFFFFF" />
                      <text x={50} y={47} textAnchor="middle" fontSize={16} fontWeight={700} fill="#1F2937">{totalStatut}</text>
                      <text x={50} y={60} textAnchor="middle" fontSize={7} fill="#6B7280">Total</text>
                    </svg>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
                      {segments.map((s) => (
                        <div key={s.statut} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5 }}>
                          <span style={{ width: 7, height: 7, borderRadius: 2, background: statusColors[s.statut] || "#6B7280", flexShrink: 0 }} />
                          <span style={{ color: "#6B7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{getStatusLabel(s.statut)}</span>
                          <span style={{ color: "#1F2937", fontWeight: 700 }}>{s.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: "#6B7280" }}>Pas encore de commandes.</p>
                )}
              </div>
            );
          })()}

{/* Activite recente - fil combine commandes/reservations/avis, owner/manager uniquement */}
          {estOwnerOuManager && activiteRecente.length > 0 && (
            <div style={{
              background: "#FFFFFF", borderRadius: 16,
              padding: "16px 20px",
              boxShadow: "0 2px 8px rgba(31,41,55,0.05)", border: "1px solid #E5E7EB",
            }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: "#1F2937" }}>
                {t("notif_activite_recente")}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 160, overflow: "auto" }}>
                {activiteRecente.slice(0, 5).map((item) => {
                  const Icone = item.type === "commande" ? ShoppingBag : item.type === "reservation" ? CalendarDays : Star;
                  const couleur = item.type === "commande" ? "#F59E0B" : item.type === "reservation" ? "#0F8B4C" : "#2563EB";
                  return (
                    <div key={item.id} style={{
                      display: "flex", gap: 10, padding: "8px 0",
                      borderBottom: "1px solid #F1F3F6",
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                        background: `${couleur}15`, display: "flex",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        <Icone size={13} color={couleur} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <p style={{ fontSize: 13, margin: 0, color: "#1F2937" }}>{item.texte}</p>
                        <p style={{ fontSize: 11, margin: 0, color: "#6B7280", whiteSpace: "nowrap" }}>{tempsRelatif(item.date)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          </div>

          {/* Rangee 2 : Commandes recentes | Avis clients | Actions rapides */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 1.2fr) minmax(220px, 1fr) minmax(220px, 1fr)", gap: 14, marginBottom: 14 }}>
{/* Commandes recentes, owner/manager uniquement */}
          {estOwnerOuManager && (() => {
            const commandesRecentes = commandes
              .slice()
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 5);

            return (
              <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, padding: "16px 20px", boxShadow: "0 2px 8px rgba(31,41,55,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", margin: 0 }}>Commandes recentes</p>
                  <button
                    onClick={() => setTab("orders")}
                    style={{ background: "none", border: "none", color: "#F59E0B", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Voir tout
                  </button>
                </div>
                {commandesRecentes.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 130, overflow: "auto" }}>
                    {commandesRecentes.map((c) => (
                      <div key={c.id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6,
                        padding: "6px 0", borderBottom: "1px solid #F1F3F6", fontSize: 11.5,
                      }}>
                        <span style={{ fontFamily: "monospace", color: "#6B7280" }}>#{c.id.slice(0, 6).toUpperCase()}</span>
                        <span style={{ color: "#1F2937", fontWeight: 600 }}>{Number(c.montant_total).toLocaleString(locale)} {c.devise}</span>
                        <span style={{
                          padding: "1px 7px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                          color: statusColors[c.statut] || "#6B7280", background: `${statusColors[c.statut] || "#6B7280"}15`,
                        }}>
                          {getStatusLabel(c.statut)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: "#6B7280" }}>Pas encore de commandes.</p>
                )}
              </div>
            );
          })()}

{/* Avis clients - likes et commentaires reels, owner/manager uniquement */}
          {estOwnerOuManager && avisStats && avisStats.totalAvis > 0 && (
            <div style={{
              background: "#FFFFFF", borderRadius: 16,
              padding: "16px 20px",
              boxShadow: "0 2px 8px rgba(31,41,55,0.05)", border: "1px solid #E5E7EB",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, background: "#FFEDD5",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <ThumbsUp size={16} color="#EA580C" />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#1F2937", margin: 0 }}>
                    {t("dash_avis_titre")}
                  </p>
                </div>
                <p style={{ fontSize: 20, fontWeight: 700, color: "#1F2937", margin: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>
                  {avisStats.pourcentageSatisfaction}%
                  <span style={{ fontSize: 13, fontWeight: 400, color: "#6B7280" }}>
                    {" "}({avisStats.totalLikes}/{avisStats.totalAvis} {t("dash_avis_likes")})
                  </span>
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 130, overflow: "auto" }}>
                {avisStats.avis.filter((a) => a.commentaire).slice(0, 5).map((a) => (
                  <div key={a.id} style={{
                    padding: "10px 14px", borderRadius: 12, background: "#F1F3F6",
                    fontSize: 13, display: "flex", gap: 10, alignItems: "flex-start",
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: a.positif ? "#E5E7EB" : "#FEE2E2",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      {a.positif ? (
                        <ThumbsUp size={13} color="#16A34A" />
                      ) : (
                        <ThumbsDown size={13} color="#DC2626" />
                      )}
                    </div>
                    <div style={{ paddingTop: 2 }}>
                      <strong>{a.auteur_nom || t("dash_avis_anonyme")}</strong>
                      {(a.commande_id || a.reservation_id) && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: "#16A34A",
                          background: "#E5E7EB", borderRadius: 8, padding: "2px 6px",
                          marginLeft: 6, verticalAlign: "middle",
                        }}>
                          ✓ {t("dash_avis_verifie")}
                        </span>
                      )}
                      <span style={{ color: "#6B7280" }}> — {a.commentaire}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

{/* Actions rapides, owner/manager uniquement */}
          {estOwnerOuManager && (
            <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 12, padding: "16px 20px", boxShadow: "0 2px 8px rgba(31,41,55,0.05)" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", margin: "0 0 12px" }}>Actions rapides</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {[
                  { label: "Nouvelle commande", cible: "caisse" as const, Icone: ShoppingBag },
                  { label: t("dash_reservations"), cible: "reservations" as const, Icone: CalendarDays },
                  { label: t("dash_menu"), cible: "menu" as const, Icone: UtensilsCrossed },
                  { label: t("dash_stats"), cible: "stats" as const, Icone: BarChart3 },
                ].map((a) => (
                  <button
                    key={a.label}
                    onClick={() => setTab(a.cible)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, background: "none",
                      border: "none", color: "#1F2937", fontSize: 12.5, fontWeight: 500,
                      cursor: "pointer", fontFamily: "inherit", padding: "5px 0", textAlign: "left",
                    }}
                  >
                    <a.Icone size={14} color="#F59E0B" />
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          </div>

          </>
          )}

          {tab !== "apercu" && (
          <>
          {/* Onglets */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid #E5E7EB",
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
                color: tab === "orders" ? "#F59E0B" : "#6B7280",
                borderBottom:
                  tab === "orders" ? "2px solid #F59E0B" : "2px solid transparent",
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
                    background: "#F59E0B",
                    color: "#1F2937",
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
                color: tab === "reservations" ? "#F59E0B" : "#6B7280",
                borderBottom:
                  tab === "reservations"
                    ? "2px solid #F59E0B"
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
                    background: "#0F8B4C",
                    color: "#1F2937",
                  }}
                >
                  {activeReservations.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("plan")}
              style={{
                padding: "10px 20px",
                border: "none",
                background: "none",
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: 500,
                color: tab === "plan" ? "#F59E0B" : "#6B7280",
                borderBottom:
                  tab === "plan" ? "2px solid #F59E0B" : "2px solid transparent",
                cursor: "pointer",
              }}
            >
              {t("dash_plan_salle")}
            </button>
            <button
              onClick={() => setTab("caisse")}
              style={{
                padding: "10px 20px",
                border: "none",
                background: "none",
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: 500,
                color: tab === "caisse" ? "#F59E0B" : "#6B7280",
                borderBottom:
                  tab === "caisse" ? "2px solid #F59E0B" : "2px solid transparent",
                cursor: "pointer",
              }}
            >
              {t("dash_caisse")}
            </button>
            {estOwnerOuManager && (
              <button
                onClick={() => setTab("menu")}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  background: "none",
                  fontFamily: "inherit",
                  fontSize: 14,
                  fontWeight: 500,
                  color: tab === "menu" ? "#F59E0B" : "#6B7280",
                  borderBottom:
                    tab === "menu" ? "2px solid #F59E0B" : "2px solid transparent",
                  cursor: "pointer",
                }}
              >
                {t("dash_menu")}
              </button>
            )}
            {estOwnerOuManager && (
              <button
                onClick={() => setTab("stats")}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  background: "none",
                  fontFamily: "inherit",
                  fontSize: 14,
                  fontWeight: 500,
                  color: tab === "stats" ? "#F59E0B" : "#6B7280",
                  borderBottom:
                    tab === "stats" ? "2px solid #F59E0B" : "2px solid transparent",
                  cursor: "pointer",
                }}
              >
                {t("dash_stats")}
              </button>
            )}
            {estOwnerOuManager && (
              <button
                onClick={() => setTab("fidelite")}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  background: "none",
                  fontFamily: "inherit",
                  fontSize: 14,
                  fontWeight: 500,
                  color: tab === "fidelite" ? "#F59E0B" : "#6B7280",
                  borderBottom:
                    tab === "fidelite" ? "2px solid #F59E0B" : "2px solid transparent",
                  cursor: "pointer",
                }}
              >
                {t("dash_fidelite")}
              </button>
            )}
            {estOwnerOuManager && (
              <button
                onClick={() => setTab("annonces")}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  background: "none",
                  fontFamily: "inherit",
                  fontSize: 14,
                  fontWeight: 500,
                  color: tab === "annonces" ? "#F59E0B" : "#6B7280",
                  borderBottom:
                    tab === "annonces" ? "2px solid #F59E0B" : "2px solid transparent",
                  cursor: "pointer",
                }}
              >
                Annonces
              </button>
            )}
          </div>

          {/* Contenu */}
          {tab === "equipe" ? (
            <>
{/* Temoignage sur la plateforme AfriTable - reserve au owner */}
          {role === "owner" && monRestaurantId && (
            <div style={{
              background: "#FFFFFF", borderRadius: 16,
              padding: "20px 22px", marginBottom: 24,
              boxShadow: "0 4px 16px rgba(31,41,55,0.09)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: "#FEF3C7",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <ChefHat size={16} color="#D97706" />
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#1F2937", margin: 0 }}>
                  {t("dash_temoignage_titre")}
                </p>
              </div>

              {temoignageSuccess ? (
                <div style={{
                  padding: "10px 14px", borderRadius: 10, background: "#E5E7EB",
                  color: "#16A34A", fontSize: 13, fontWeight: 600,
                }}>
                  {t("avis_merci")}
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                    <button
                      onClick={() => setTemoignagePositif(true)}
                      style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        padding: "9px 0", borderRadius: 8,
                        border: temoignagePositif === true ? "2px solid #16A34A" : "1px solid #E5E7EB",
                        background: temoignagePositif === true ? "#E5E7EB" : "#FFFFFF",
                        color: temoignagePositif === true ? "#16A34A" : "#6B7280",
                        cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                        boxShadow: temoignagePositif === true ? "none" : "0 1px 2px rgba(31,41,55,0.06)",
                        transition: "all 0.15s",
                      }}
                    >
                      <ThumbsUp size={14} /> {t("avis_jaime")}
                    </button>
                    <button
                      onClick={() => setTemoignagePositif(false)}
                      style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        padding: "9px 0", borderRadius: 8,
                        border: temoignagePositif === false ? "2px solid #DC2626" : "1px solid #E5E7EB",
                        background: temoignagePositif === false ? "#FEE2E2" : "#FFFFFF",
                        color: temoignagePositif === false ? "#DC2626" : "#6B7280",
                        cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                        boxShadow: temoignagePositif === false ? "none" : "0 1px 2px rgba(31,41,55,0.06)",
                        transition: "all 0.15s",
                      }}
                    >
                      <ThumbsDown size={14} /> {t("avis_jaime_pas")}
                    </button>
                  </div>
                  <textarea
                    value={temoignageCommentaire}
                    onChange={(e) => setTemoignageCommentaire(e.target.value)}
                    placeholder={t("avis_commentaire_placeholder")}
                    rows={2}
                    style={{
                      width: "100%", padding: "10px 12px", border: "1px solid #E5E7EB",
                      borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit",
                      boxSizing: "border-box", marginBottom: 10, resize: "vertical",
                      boxShadow: "inset 0 1px 3px rgba(31,41,55,0.04)",
                    }}
                  />
                  <button
                    disabled={temoignagePositif === null || temoignageLoading}
                    onClick={handleSubmitTemoignage}
                    style={{
                      padding: "9px 20px", borderRadius: 8, border: "none",
                      background: temoignagePositif === null || temoignageLoading ? "#6B7280" : "#F59E0B",
                      color: "#1F2937", fontSize: 13, fontWeight: 600,
                      cursor: temoignagePositif === null || temoignageLoading ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                      boxShadow: temoignagePositif === null || temoignageLoading ? "none" : "0 2px 6px rgba(245,158,11,0.35)",
                      transition: "all 0.15s",
                    }}
                  >
                    {temoignageLoading ? t("chargement") : t("avis_envoyer")}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Gestion d'equipe - reserve au owner, pour tracabilite des actions */}
          {role === "owner" && monRestaurantId && (
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
                  <Users size={16} color="#2563EB" />
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#1F2937", margin: 0 }}>
                  {t("equipe_titre")}
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {equipe.length === 0 ? (
                  <p style={{ fontSize: 13, color: "#6B7280" }}>{t("equipe_vide")}</p>
                ) : (
                  equipe.map((m) => {
                    const roleColors: Record<string, { bg: string; text: string }> = {
                      owner: { bg: "#FEF3C7", text: "#D97706" },
                      manager: { bg: "#DBEAFE", text: "#2563EB" },
                      staff: { bg: "#F1F3F6", text: "#6B7280" },
                      cuisine: { bg: "#FFEDD5", text: "#EA580C" },
                    };
                    const couleurs = roleColors[m.role] || roleColors.staff;
                    return (
                      <div key={m.id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 14px", borderRadius: 12, background: "#F1F3F6",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%", background: "#F59E0B",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "#1F2937", fontWeight: 700, fontSize: 13, flexShrink: 0,
                          }}>
                            {m.email.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{m.email}</span>
                          {m.role === "owner" ? (
                            <span style={{
                              padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                              textTransform: "uppercase", letterSpacing: 0.3,
                              background: couleurs.bg, color: couleurs.text,
                            }}>
                              {t(`dash_role_${m.role}`)}
                            </span>
                          ) : (
                            <select
                              value={m.role}
                              onChange={(e) => handleModifierRole(m.id, e.target.value)}
                              style={{
                                padding: "3px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                                textTransform: "uppercase", letterSpacing: 0.3,
                                background: couleurs.bg, color: couleurs.text,
                                border: "none", cursor: "pointer", fontFamily: "inherit",
                              }}
                            >
                              <option value="manager">{t("dash_role_manager")}</option>
                              <option value="staff">{t("dash_role_staff")}</option>
                              <option value="cuisine">{t("dash_role_cuisine")}</option>
                            </select>
                          )}
                        </div>
                        {m.role !== "owner" && (
                          <button
                            onClick={() => handleRetirerStaff(m.id)}
                            style={{
                              padding: "5px 12px", borderRadius: 8, border: "none",
                              background: "#FEE2E2", color: "#DC2626",
                              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                              transition: "opacity 0.15s",
                            }}
                          >
                            {t("equipe_retirer")}
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#1F2937", margin: "0 0 10px" }}>
                  {t("equipe_inviter_titre")}
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ position: "relative", flex: "1 1 220px" }}>
                    <Mail size={15} color="#6B7280" style={{ position: "absolute", left: 12, top: 11 }} />
                    <input
                      type="email"
                      value={equipeEmail}
                      onChange={(e) => {
                        setEquipeEmail(e.target.value);
                        if (equipeMotDePasseGenere) setEquipeMotDePasseGenere(null);
                      }}
                      placeholder="email@exemple.com"
                      style={{
                        width: "100%", padding: "9px 12px 9px 34px", border: "1px solid #E5E7EB",
                        borderRadius: 10, fontSize: 13, outline: "none", fontFamily: "inherit",
                        boxSizing: "border-box",
                        boxShadow: "inset 0 1px 2px rgba(31,41,55,0.04)",
                      }}
                    />
                  </div>
                  <select
                    value={equipeRole}
                    onChange={(e) => setEquipeRole(e.target.value)}
                    style={{
                      padding: "9px 12px", border: "1px solid #E5E7EB",
                      borderRadius: 10, fontSize: 13, fontFamily: "inherit",
                      background: "#FFFFFF", cursor: "pointer",
                    }}
                  >
                    <option value="manager">{t("dash_role_manager")}</option>
                    <option value="staff">{t("dash_role_staff")}</option>
                    <option value="cuisine">{t("dash_role_cuisine")}</option>
                  </select>
                  <button
                    disabled={equipeLoading}
                    onClick={handleInviterStaff}
                    style={{
                      padding: "9px 20px", borderRadius: 10, border: "none",
                      background: equipeLoading ? "#6B7280" : "#F59E0B",
                      color: "#1F2937", fontSize: 13, fontWeight: 600,
                      cursor: equipeLoading ? "not-allowed" : "pointer", fontFamily: "inherit",
                      boxShadow: equipeLoading ? "none" : "0 2px 8px rgba(245,158,11,0.3)",
                      transition: "all 0.15s",
                    }}
                  >
                    {equipeLoading ? t("chargement") : t("equipe_inviter")}
                  </button>
                </div>
              </div>
              {equipeError && (
                <p style={{ fontSize: 12, color: "#DC2626", marginTop: 8 }}>{equipeError}</p>
              )}
              {equipeMotDePasseGenere && (
                <div style={{
                  marginTop: 12, padding: "14px 16px", borderRadius: 12,
                  background: "#E5E7EB", border: "1px solid #BBF7D0",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#16A34A", margin: 0 }}>
                      {t("equipe_identifiants_titre")}
                    </p>
                    <button
                      onClick={() => setEquipeMotDePasseGenere(null)}
                      aria-label="Fermer"
                      style={{
                        background: "none", border: "none", color: "#16A34A",
                        cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 4,
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13 }}>
                      <strong>Email :</strong> {equipeMotDePasseGenere.email}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 13, fontFamily: "monospace" }}>
                      <strong>{t("equipe_mot_de_passe")} :</strong> {equipeMotDePasseGenere.motDePasse}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `Email: ${equipeMotDePasseGenere.email}\nMot de passe: ${equipeMotDePasseGenere.motDePasse}`
                        );
                      }}
                      style={{
                        padding: "4px 12px", borderRadius: 8, border: "1px solid #BBF7D0",
                        background: "#FFFFFF", color: "#16A34A", fontSize: 12, fontWeight: 600,
                        cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                      }}
                    >
                      {t("equipe_copier")}
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: "#6B7280", marginTop: 8, marginBottom: 0 }}>
                    {t("equipe_avertissement_mdp")}
                  </p>
                </div>
              )}
            </div>
          )}

                      </>
          ) : tab === "fidelite" ? (
            monRestaurantId && <FideliteEtPromotions restaurantId={monRestaurantId} />
          ) : tab === "annonces" ? (
            monRestaurantId && <Annonces restaurantId={monRestaurantId} />
          ) : tab === "stats" ? (
            monRestaurantId && <Statistiques restaurantId={monRestaurantId} />
          ) : tab === "menu" ? (
            monRestaurantId && (
              <GestionMenu
                restaurantId={monRestaurantId}
                slug={monRestaurantInfos?.slug}
                pays={monRestaurantInfos?.pays}
                locale={locale}
              />
            )
          ) : tab === "caisse" ? (
            monRestaurantId && <ModeCaisse restaurantId={monRestaurantId} />
          ) : tab === "plan" ? (
            monRestaurantId && (
              <PlanDeSalle restaurantId={monRestaurantId} peutEditer={estOwnerOuManager} />
            )
          ) : tab === "orders" ? (
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
                      background: "#FFFFFF",
                      border: "1px solid #E5E7EB",
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
                              : cmd.type === "livraison"
                              ? t("dash_livraison")
                              : t("order_type_sur_place")}
                          </span>
                          {cmd.type === "livraison" && cmd.adresse_livraison && (
                            <>
                              <span style={{ opacity: 0.4 }}>|</span>
                              <span style={{ color: "#DC2626", fontWeight: 600 }}>
                                📍 {cmd.adresse_livraison}
                              </span>
                            </>
                          )}
                          <span
                            style={{ opacity: 0.4 }}
                          >
                            |
                          </span>
                          <span style={{ fontWeight: 600, color: "#F59E0B" }}>
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
                              background: "#F59E0B",
                              color: "#1F2937",
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
                              background: "#0F8B4C",
                              color: "#1F2937",
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
                              background: "#F59E0B",
                              color: "#1F2937",
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
                              border: "1px solid #E5E7EB",
                              background: "#FFFFFF",
                              color: "#DC2626",
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
                    background: "#FFFFFF",
                    border: "1px solid #E5E7EB",
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
                            background: "#F59E0B",
                            color: "#1F2937",
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
                            background: "#0F8B4C",
                            color: "#1F2937",
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
                            border: "1px solid #E5E7EB",
                            background: "#FFFFFF",
                            color: "#DC2626",
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
          </>
          )}
          </div>
        </div>
      </main>

      <style jsx>{`
        .dashboard-sidebar button:hover {
          background: rgba(245, 158, 11, 0.18) !important;
        }
        @media (max-width: 768px) {
          .dashboard-layout {
            flex-direction: column !important;
          }
          .dashboard-sidebar {
            width: 100% !important;
            position: static !important;
            overflow-x: auto !important;
          }
          .dashboard-sidebar nav {
            flex-direction: row !important;
            overflow-x: auto !important;
            padding-bottom: 4px !important;
          }
          .dashboard-sidebar nav > * {
            flex-shrink: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}