"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Store, CalendarDays, ShoppingBag, Users, Wallet } from "lucide-react";
import AuthNav from "@/components/AuthNav";

type Restaurant = {
  id: string;
  nom: string;
  slug: string;
  pays: string;
  ville: string;
  quartier: string;
  tier: string;
  devise: string;
  statut_abonnement: string;
  telephone: string;
  created_at: string;
};

type Statistiques = {
  totalRestaurants: number;
  totalReservations: number;
  totalCommandes: number;
  totalClients: number;
  totalRevenus: number;
};

const PAYS_OPTIONS = [
  { code: "CI", nom: "Cote d'Ivoire", devise: "XOF" },
  { code: "SN", nom: "Senegal", devise: "XOF" },
  { code: "ML", nom: "Mali", devise: "XOF" },
  { code: "CM", nom: "Cameroun", devise: "XAF" },
  { code: "BF", nom: "Burkina Faso", devise: "XOF" },
  { code: "BJ", nom: "Benin", devise: "XOF" },
  { code: "TG", nom: "Togo", devise: "XOF" },
  { code: "NE", nom: "Niger", devise: "XOF" },
  { code: "GN", nom: "Guinee", devise: "XOF" },
  { code: "CD", nom: "RD Congo", devise: "CDF" },
  { code: "GA", nom: "Gabon", devise: "XAF" },
  { code: "CG", nom: "Congo", devise: "XAF" },
  { code: "TD", nom: "Tchad", devise: "XAF" },
  { code: "GH", nom: "Ghana", devise: "GHS" },
  { code: "NG", nom: "Nigeria", devise: "NGN" },
  { code: "KE", nom: "Kenya", devise: "KES" },
  { code: "AO", nom: "Angola", devise: "AOA" },
  { code: "MZ", nom: "Mozambique", devise: "MZN" },
];

const TIER_DETAILS: Record<string, { color: string; bg: string; prix: string }> = {
  starter: { color: "#3B82F6", bg: "#EFF6FF", prix: "10 000" },
  business: { color: "#E8A93B", bg: "#FFFBEB", prix: "25 000" },
  groupe: { color: "#A855F7", bg: "#FAF5FF", prix: "Sur devis" },
};

const STATUT_COLORS: Record<string, string> = {
  actif: "#22C55E",
  suspendu: "#EF4444",
  essai: "#F59E0B",
  expire: "#6B7280",
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

export default function AdminClient() {
  const t = useTranslations();
  const supabase = createClient();
  const [locale, setLocale] = useState("fr");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [stats, setStats] = useState<Statistiques>({
    totalRestaurants: 0,
    totalReservations: 0,
    totalCommandes: 0,
    totalClients: 0,
    totalRevenus: 0,
  });
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Formulaire
  const [formNom, setFormNom] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formPays, setFormPays] = useState("CI");
  const [formVille, setFormVille] = useState("");
  const [formQuartier, setFormQuartier] = useState("");
  const [formTier, setFormTier] = useState("starter");
  const [formTelephone, setFormTelephone] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [avisPlateforme, setAvisPlateforme] = useState<{
    totalAvisClients: number;
    totalLikes: number;
    pourcentageSatisfaction: number | null;
    temoignagesProprietaires: any[];
  } | null>(null);
  const [avisModeration, setAvisModeration] = useState<any[]>([]);
  const [showModeration, setShowModeration] = useState(false);

  async function toggleVisibiliteAvis(id: string, visibleActuel: boolean) {
    await fetch("/api/avis", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, visible: !visibleActuel }),
    });
    setAvisModeration((prev) =>
      prev.map((a) => (a.id === id ? { ...a, visible: !visibleActuel } : a))
    );
  }

  const navKeys = ["nav_home", "nav_restaurants", "nav_pricing", "nav_dashboard", "nav_admin", "nav_login"];

  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/(fr|en|es|pt)/);
    if (match) setLocale(match[1]);
  }, []);

  useEffect(() => {
    loadData();
    fetch("/api/avis?scope=plateforme")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setAvisPlateforme(data))
      .catch(() => {});
    fetch("/api/avis?scope=moderation")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setAvisModeration(data.avis || []))
      .catch(() => {});
  }, []);

  async function loadData() {
    const { data: restos } = await supabase
      .from("restaurants")
      .select("*")
      .order("created_at", { ascending: false });

    if (restos) setRestaurants(restos as Restaurant[]);

    const { count: totalRestaurants } = await supabase
      .from("restaurants")
      .select("*", { count: "exact", head: true });

    const { count: totalReservations } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true });

    const { count: totalCommandes } = await supabase
      .from("commandes")
      .select("*", { count: "exact", head: true });

    const { count: totalClients } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true });

    const { data: paiements } = await supabase
      .from("paiements")
      .select("montant, devise")
      .eq("statut", "reussi");

    const totalRevenus = (paiements || []).reduce(
      (s: number, p: any) => s + Number(p.montant),
      0
    );

    setStats({
      totalRestaurants: totalRestaurants || 0,
      totalReservations: totalReservations || 0,
      totalCommandes: totalCommandes || 0,
      totalClients: totalClients || 0,
      totalRevenus,
    });
  }

  function genererSlug(nom: string): string {
    return nom
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!formNom || !formVille) {
      setFormError("Le nom et la ville sont obligatoires");
      return;
    }

    const slug = formSlug || genererSlug(formNom);
    const paysObj = PAYS_OPTIONS.find((p) => p.code === formPays);
    const devise = paysObj?.devise || "XOF";

    setFormLoading(true);

    const { data, error } = await supabase
      .from("restaurants")
      .insert({
        nom: formNom,
        slug: slug,
        pays: formPays,
        ville: formVille,
        quartier: formQuartier,
        tier: formTier,
        devise: devise,
        telephone: formTelephone || null,
        statut_abonnement: "essai",
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes("unique")) {
        setFormError(`Le slug "${slug}" existe deja. Choisissez un autre nom ou modifiez le slug.`);
      } else {
        setFormError(error.message);
      }
      setFormLoading(false);
      return;
    }

    // Inserer la traduction francaise par defaut
    if (data) {
      await supabase.from("traductions").insert({
        entite_type: "restaurant",
        entite_id: data.id,
        langue: "fr",
        champ: "nom",
        valeur: formNom,
      });
    }

    setFormSuccess(`Restaurant "${formNom}" cree avec succes (slug: /${formPays.toLowerCase()}/${slug})`);
    setFormNom("");
    setFormSlug("");
    setFormVille("");
    setFormQuartier("");
    setFormTelephone("");
    setFormTier("starter");
    setShowForm(false);
    setFormLoading(false);
    loadData();
  }

  async function suspendreRestaurant(id: string, currentStatut: string) {
    const newStatut = currentStatut === "actif" ? "suspendu" : "actif";
    await supabase.from("restaurants").update({ statut_abonnement: newStatut }).eq("id", id);
    loadData();
  }

  const statCards = [
    { label: "Restaurants", value: stats.totalRestaurants, color: "#C75B39", Icone: Store },
    { label: "Reservations", value: stats.totalReservations, color: "#E8A93B", Icone: CalendarDays },
    { label: "Commandes", value: stats.totalCommandes, color: "#C75B39", Icone: ShoppingBag },
    { label: "Clients", value: stats.totalClients, color: "#3B82F6", Icone: Users },
    { label: "Revenus (XOF)", value: formatPrice(stats.totalRevenus, "XOF"), color: "#22C55E", Icone: Wallet },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#FDF8F0" }}>
      {/* Header */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)",
        borderBottom: "1px solid #E5E1D8", padding: "0 24px"
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: 64
        }}>
          <a href={`/${locale}`} style={{
            display: "flex", alignItems: "center", gap: 10, textDecoration: "none"
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: "#C75B39",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 700, fontSize: 18
            }}>R</div>
            <span style={{ fontWeight: 700, fontSize: 18, color: "#C75B39" }}>ReservDine</span>
          </a>
          <AuthNav navKeys={navKeys} locale={locale} activeKey="nav_admin" />
        </div>
      </header>

      <main style={{ paddingTop: 96, paddingLeft: 24, paddingRight: 24, paddingBottom: 32 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {/* Titre */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 32, flexWrap: "wrap", gap: 16
          }}>
            <div>
              <div style={{
                width: 56, height: 3, marginBottom: 16,
                background: "linear-gradient(to right, #E8A93B, #C75B39)", borderRadius: 2
              }} />
              <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 800, color: "#1A1A2E" }}>
                Super Admin
              </h1>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              style={{
                padding: "12px 24px", borderRadius: 12, border: "none",
                background: "#C75B39", color: "white", fontWeight: 600,
                fontSize: 14, cursor: "pointer", fontFamily: "inherit"
              }}
            >
              {showForm ? "Annuler" : "+ Ajouter un restaurant"}
            </button>
          </div>

          {/* Formulaire */}
          {showForm && (
            <div style={{
              background: "white", border: "1px solid #E5E1D8", borderRadius: 16,
              padding: 28, marginBottom: 32, boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
            }}>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
                Nouveau restaurant
              </h2>
              {formError && (
                <div style={{
                  padding: "12px 16px", borderRadius: 10, marginBottom: 16,
                  background: "#FEE2E2", color: "#991B1B", fontSize: 14
                }}>{formError}</div>
              )}
              {formSuccess && (
                <div style={{
                  padding: "12px 16px", borderRadius: 10, marginBottom: 16,
                  background: "#DCFCE7", color: "#166534", fontSize: 14
                }}>{formSuccess}</div>
              )}
              <form onSubmit={handleSubmit}>
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16
                }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                      Nom du restaurant *
                    </label>
                    <input
                      type="text"
                      value={formNom}
                      onChange={(e) => setFormNom(e.target.value)}
                      onInput={(e: React.FormEvent<HTMLInputElement>) => {
                        if (!formSlug) setFormSlug(genererSlug(e.currentTarget.value));
                      }}
                      style={{
                        width: "100%", padding: "10px 14px", border: "2px solid #E5E1D8",
                        borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit",
                        boxSizing: "border-box"
                      }}
                      placeholder="Le Baobab"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                      Slug (URL)
                    </label>
                    <input
                      type="text"
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value)}
                      style={{
                        width: "100%", padding: "10px 14px", border: "2px solid #E5E1D8",
                        borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit",
                        boxSizing: "border-box"
                      }}
                      placeholder="le-baobab"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                      Pays *
                    </label>
                    <select
                      value={formPays}
                      onChange={(e) => setFormPays(e.target.value)}
                      style={{
                        width: "100%", padding: "10px 14px", border: "2px solid #E5E1D8",
                        borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit",
                        boxSizing: "border-box"
                      }}
                    >
                      {PAYS_OPTIONS.map((p) => (
                        <option key={p.code} value={p.code}>{p.nom} ({p.code}) — {p.devise}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                      Ville *
                    </label>
                    <input
                      type="text"
                      value={formVille}
                      onChange={(e) => setFormVille(e.target.value)}
                      style={{
                        width: "100%", padding: "10px 14px", border: "2px solid #E5E1D8",
                        borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit",
                        boxSizing: "border-box"
                      }}
                      placeholder="Abidjan"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                      Quartier
                    </label>
                    <input
                      type="text"
                      value={formQuartier}
                      onChange={(e) => setFormQuartier(e.target.value)}
                      style={{
                        width: "100%", padding: "10px 14px", border: "2px solid #E5E1D8",
                        borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit",
                        boxSizing: "border-box"
                      }}
                      placeholder="Cocody"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                      Tier
                    </label>
                    <select
                      value={formTier}
                      onChange={(e) => setFormTier(e.target.value)}
                      style={{
                        width: "100%", padding: "10px 14px", border: "2px solid #E5E1D8",
                        borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit",
                        boxSizing: "border-box"
                      }}
                    >
                      <option value="starter">Starter (10 000 FCFA/mois)</option>
                      <option value="business">Business (25 000 FCFA/mois)</option>
                      <option value="groupe">Groupe / Franchise (sur devis)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                      Telephone
                    </label>
                    <input
                      type="text"
                      value={formTelephone}
                      onChange={(e) => setFormTelephone(e.target.value)}
                      style={{
                        width: "100%", padding: "10px 14px", border: "2px solid #E5E1D8",
                        borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit",
                        boxSizing: "border-box"
                      }}
                      placeholder="+22507070707"
                    />
                  </div>
                </div>
                <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
                  <button
                    type="submit"
                    disabled={formLoading}
                    style={{
                      padding: "12px 28px", borderRadius: 12, border: "none",
                      background: formLoading ? "#9CA3AF" : "#C75B39", color: "white",
                      fontWeight: 600, fontSize: 14, cursor: formLoading ? "not-allowed" : "pointer",
                      fontFamily: "inherit"
                    }}
                  >
                    {formLoading ? "Creation..." : "Creer le restaurant"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    style={{
                      padding: "12px 28px", borderRadius: 12,
                      border: "2px solid #E5E1D8", background: "white",
                      color: "#6B7280", fontWeight: 600, fontSize: 14,
                      cursor: "pointer", fontFamily: "inherit"
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Statistiques */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16, marginBottom: 32
          }}>
            {statCards.map((card) => (
              <div key={card.label} style={{
                background: "white", border: "1px solid #E5E1D8", borderRadius: 16,
                padding: 20, boxShadow: "0 2px 8px rgba(38,34,28,0.06)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: `${card.color}15`, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    color: card.color
                  }}>
                    <card.Icone size={20} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 2 }}>{card.label}</p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: "#1A1A2E", fontFamily: "system-ui, -apple-system, sans-serif" }}>
                      {card.value}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Avis plateforme - total likes clients + temoignages proprietaires uniquement */}
          {avisPlateforme && (
            <div style={{
              background: "white", border: "1px solid #E5E1D8", borderRadius: 16,
              padding: 24, marginBottom: 32,
              boxShadow: "0 2px 8px rgba(38,34,28,0.06)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
                <h3 style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, margin: 0 }}>
                  {t("admin_avis_titre")}
                </h3>
                <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "system-ui, -apple-system, sans-serif" }}>
                  {avisPlateforme.pourcentageSatisfaction != null ? `${avisPlateforme.pourcentageSatisfaction}%` : "—"}
                  {" "}
                  <span style={{ fontSize: 13, fontWeight: 400, color: "#6B7280" }}>
                    ({avisPlateforme.totalLikes}/{avisPlateforme.totalAvisClients} {t("dash_avis_likes")})
                  </span>
                </span>
              </div>

              {avisPlateforme.temoignagesProprietaires.length > 0 && (
                <>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#6B7280", marginBottom: 10 }}>
                    {t("admin_temoignages_titre")}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {avisPlateforme.temoignagesProprietaires.map((tem) => (
                      <div key={tem.id} style={{
                        padding: "10px 14px", borderRadius: 10, background: "#FDF8F0",
                        fontSize: 13, display: "flex", gap: 8,
                      }}>
                        <span>{tem.positif ? "👍" : "👎"}</span>
                        <div>
                          <strong>{tem.auteur_nom || t("dash_avis_anonyme")}</strong>
                          {tem.commentaire ? ` — ${tem.commentaire}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <button
                onClick={() => setShowModeration(!showModeration)}
                style={{
                  marginTop: 16, padding: "8px 14px", borderRadius: 8,
                  border: "1px solid #E5E1D8", background: "white",
                  fontSize: 13, fontWeight: 600, color: "#6B7280",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {showModeration ? t("admin_moderation_fermer") : t("admin_moderation_ouvrir")}
              </button>

              {showModeration && (
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflow: "auto" }}>
                  {avisModeration.length === 0 ? (
                    <p style={{ fontSize: 13, color: "#6B7280" }}>{t("admin_moderation_vide")}</p>
                  ) : (
                    avisModeration.map((a) => (
                      <div key={a.id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        gap: 12, padding: "10px 14px", borderRadius: 10,
                        background: a.visible ? "#FDF8F0" : "#FEF2F2",
                        opacity: a.visible ? 1 : 0.7,
                      }}>
                        <div style={{ fontSize: 13, flex: 1 }}>
                          <span>{a.positif ? "👍" : "👎"}</span>
                          {" "}
                          <strong>{a.restaurants?.nom || "?"}</strong>
                          {" — "}
                          <span>{a.auteur_nom || t("dash_avis_anonyme")}</span>
                          {a.commentaire ? ` : ${a.commentaire}` : ""}
                        </div>
                        <button
                          onClick={() => toggleVisibiliteAvis(a.id, a.visible)}
                          style={{
                            padding: "5px 12px", borderRadius: 8, border: "none",
                            background: a.visible ? "#FEE2E2" : "#DCFCE7",
                            color: a.visible ? "#991B1B" : "#166534",
                            fontSize: 12, fontWeight: 600, cursor: "pointer",
                            whiteSpace: "nowrap", fontFamily: "inherit",
                          }}
                        >
                          {a.visible ? t("admin_masquer") : t("admin_afficher")}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Liste restaurants */}
          <div style={{
            width: 56, height: 3, marginBottom: 16,
            background: "linear-gradient(to right, #E8A93B, #C75B39)", borderRadius: 2
          }} />
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 800, marginBottom: 20, color: "#1A1A2E" }}>
            Restaurants ({restaurants.length})
          </h2>

          {restaurants.length === 0 ? (
            <p style={{ color: "#6B7280", textAlign: "center", padding: 40 }}>
              Aucun restaurant. Cliquez sur "Ajouter un restaurant" pour commencer.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {restaurants.map((r) => {
                const tier = TIER_DETAILS[r.tier] || TIER_DETAILS.starter;
                const statutColor = STATUT_COLORS[r.statut_abonnement] || "#6B7280";
                return (
                  <div key={r.id} style={{
                    background: "white", border: "1px solid #E5E1D8", borderRadius: 16,
                    padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
                  }}>
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      gap: 16, flexWrap: "wrap"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1, minWidth: 200 }}>
                        <div style={{
                          width: 48, height: 48, borderRadius: 14,
                          background: `${tier.color}15`, display: "flex",
                          alignItems: "center", justifyContent: "center",
                          color: tier.color, fontWeight: 700, fontSize: 20, flexShrink: 0
                        }}>
                          {r.nom.charAt(0)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                            <h3 style={{ fontWeight: 700, fontSize: 16, color: "#1A1A2E" }}>{r.nom}</h3>
                            <span style={{
                              padding: "2px 8px", borderRadius: 6, fontSize: 10,
                              fontWeight: 700, color: tier.color, background: tier.bg
                            }}>{r.tier.toUpperCase()}</span>
                            <span style={{
                              padding: "2px 8px", borderRadius: 6, fontSize: 10,
                              fontWeight: 700, color: statutColor, background: `${statutColor}15`
                            }}>{r.statut_abonnement}</span>
                          </div>
                          <div style={{ display: "flex", gap: 12, fontSize: 13, color: "#6B7280", flexWrap: "wrap" }}>
                            <span>{r.ville}{r.quartier ? `, ${r.quartier}` : ""}</span>
                            <span style={{ opacity: 0.4 }}>|</span>
                            <span>{r.pays}</span>
                            <span style={{ opacity: 0.4 }}>|</span>
                            <span>{r.devise}</span>
                            <span style={{ opacity: 0.4 }}>|</span>
                            <span style={{ fontFamily: "monospace", fontSize: 12 }}>/{r.pays.toLowerCase()}/{r.slug}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <a
                          href={`/${locale}/${r.pays.toLowerCase()}/${r.slug}`}
                          style={{
                            padding: "8px 16px", borderRadius: 10, border: "1px solid #E5E1D8",
                            background: "white", color: "#C75B39", fontWeight: 600,
                            fontSize: 13, cursor: "pointer", textDecoration: "none",
                            fontFamily: "inherit"
                          }}
                        >
                          Voir
                        </a>
                        <button
                          onClick={() => suspendreRestaurant(r.id, r.statut_abonnement)}
                          style={{
                            padding: "8px 16px", borderRadius: 10,
                            border: `1px solid ${statutColor}`, background: "white",
                            color: statutColor, fontWeight: 600, fontSize: 13,
                            cursor: "pointer", fontFamily: "inherit"
                          }}
                        >
                          {r.statut_abonnement === "actif" ? "Suspendre" : "Activer"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}