"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Store, CalendarDays, ShoppingBag, Users, Wallet, ArrowLeft, QrCode } from "lucide-react";
import AuthNav from "@/components/AuthNav";
import QrCommunication from "@/components/QrCommunication";
import GestionMenu from "@/components/GestionMenu";
import VueEnsemble from "@/components/admin/VueEnsemble";

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
  logo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  couleur_primaire: string | null;
  couleur_secondaire: string | null;
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
  starter: { color: "#85B7EB", bg: "#042C53", prix: "20 000 (unique)" },
  business: { color: "#0F8B4C", bg: "#412402", prix: "35 000" },
  groupe: { color: "#C4B5FD", bg: "#2A1D45", prix: "Sur devis" },
};

const STATUT_COLORS: Record<string, string> = {
  actif: "#97C459",
  suspendu: "#F09595",
  essai: "#F59E0B",
  expire: "#9BB5A5",
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
  const [qrOuvertPour, setQrOuvertPour] = useState<string | null>(null);
  const [menuOuvertPour, setMenuOuvertPour] = useState<string | null>(null);
  const [personnalisationOuvertPour, setPersonnalisationOuvertPour] = useState<string | null>(null);
  const [editCouleurPrimaire, setEditCouleurPrimaire] = useState("#F59E0B");
  const [editCouleurSecondaire, setEditCouleurSecondaire] = useState("#3B6D11");
  const [editLatitude, setEditLatitude] = useState("");
  const [editLongitude, setEditLongitude] = useState("");
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
  const [formLogoFile, setFormLogoFile] = useState<File | null>(null);
  const [uploadLogoEnCours, setUploadLogoEnCours] = useState<string | null>(null);
  const [formLatitude, setFormLatitude] = useState("");
  const [formLongitude, setFormLongitude] = useState("");
  const [formLocalisationEnCours, setFormLocalisationEnCours] = useState(false);
  const [formLocalisationError, setFormLocalisationError] = useState("");
  const [formCouleurPrimaire, setFormCouleurPrimaire] = useState("#F59E0B");
  const [formCouleurSecondaire, setFormCouleurSecondaire] = useState("#3B6D11");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [couleursEnCours, setCouleursEnCours] = useState<string | null>(null);
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

  // Recupere la position GPS actuelle du navigateur (le super_admin est en
  // general sur place au moment de la creation, ou saisit les coordonnees
  // relevees sur Google Maps) et remplit les champs latitude/longitude
  // du formulaire de creation.
  function handleLocaliserAutomatiquement() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setFormLocalisationError("La geolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
    setFormLocalisationEnCours(true);
    setFormLocalisationError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormLatitude(pos.coords.latitude.toFixed(6));
        setFormLongitude(pos.coords.longitude.toFixed(6));
        setFormLocalisationEnCours(false);
      },
      () => {
        setFormLocalisationError("Position indisponible. Saisissez les coordonnees manuellement.");
        setFormLocalisationEnCours(false);
      }
    );
  }

  // Met a jour les couleurs d'un restaurant existant (personnalisation
  // de sa fiche publique).
  async function handleChangerCouleurs(
    restaurantId: string,
    couleurPrimaire: string,
    couleurSecondaire: string
  ) {
    setCouleursEnCours(restaurantId);
    await supabase
      .from("restaurants")
      .update({ couleur_primaire: couleurPrimaire, couleur_secondaire: couleurSecondaire })
      .eq("id", restaurantId);
    setCouleursEnCours(null);
    loadData();
  }

  // Met a jour la localisation GPS d'un restaurant existant.
  async function handleChangerLocalisation(restaurantId: string, latitude: string, longitude: string) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    await supabase.from("restaurants").update({ latitude: lat, longitude: lng }).eq("id", restaurantId);
    loadData();
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

  async function uploaderLogo(restaurantId: string, fichier: File): Promise<string | null> {
    const extension = fichier.name.split(".").pop();
    const nomFichier = `${restaurantId}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("restaurant-logos")
      .upload(nomFichier, fichier, { upsert: true });

    if (uploadError) return null;

    const { data } = supabase.storage.from("restaurant-logos").getPublicUrl(nomFichier);
    await supabase.from("restaurants").update({ logo_url: data.publicUrl }).eq("id", restaurantId);
    return data.publicUrl;
  }

  async function handleChangerLogoExistant(restaurantId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;

    setUploadLogoEnCours(restaurantId);
    await uploaderLogo(restaurantId, fichier);
    setUploadLogoEnCours(null);
    loadData();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!formNom || !formVille) {
      setFormError("Le nom et la ville sont obligatoires");
      return;
    }

    if (!formLatitude || !formLongitude) {
      setFormError(
        "La localisation (latitude/longitude) est obligatoire — utilisez le bouton \"Me localiser\" ou saisissez les coordonnees manuellement."
      );
      return;
    }

    const lat = parseFloat(formLatitude);
    const lng = parseFloat(formLongitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setFormError("Latitude/longitude invalides.");
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
        latitude: lat,
        longitude: lng,
        couleur_primaire: formCouleurPrimaire,
        couleur_secondaire: formCouleurSecondaire,
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

      // Upload du logo fourni par le restaurant, si un fichier a ete choisi
      if (formLogoFile) {
        await uploaderLogo(data.id, formLogoFile);
      }
    }

    setFormSuccess(`Restaurant "${formNom}" cree avec succes (slug: /${formPays.toLowerCase()}/${slug})`);
    setFormNom("");
    setFormSlug("");
    setFormVille("");
    setFormQuartier("");
    setFormTelephone("");
    setFormLogoFile(null);
    setFormTier("starter");
    setFormLatitude("");
    setFormLongitude("");
    setFormLocalisationError("");
    setFormCouleurPrimaire("#F59E0B");
    setFormCouleurSecondaire("#3B6D11");
    setShowForm(false);
    setFormLoading(false);
    loadData();

    // Ouvre automatiquement le panneau QR du restaurant qu'on vient de
    // creer, plutot que d'obliger a le rechercher ensuite dans la liste.
    if (data) setQrOuvertPour(data.id);
  }

  async function suspendreRestaurant(id: string, currentStatut: string) {
    const newStatut = currentStatut === "actif" ? "suspendu" : "actif";
    await supabase.from("restaurants").update({ statut_abonnement: newStatut }).eq("id", id);
    loadData();
  }

  const statCards = [
    { label: "Restaurants", value: stats.totalRestaurants, color: "#F59E0B", Icone: Store },
    { label: "Reservations", value: stats.totalReservations, color: "#0F8B4C", Icone: CalendarDays },
    { label: "Commandes", value: stats.totalCommandes, color: "#F59E0B", Icone: ShoppingBag },
    { label: "Clients", value: stats.totalClients, color: "#85B7EB", Icone: Users },
    { label: "Revenus (XOF)", value: formatPrice(stats.totalRevenus, "XOF"), color: "#97C459", Icone: Wallet },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0B2818" }}>
      {/* Header */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(11,40,24,0.92)", backdropFilter: "blur(8px)",
        borderBottom: "1px solid #1D4A31", padding: "0 24px"
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: 64, gap: 12
        }}>
          <a href={`/${locale}`} style={{
            display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0
          }}>
            <img src="/images/logo-afritable.png" alt="AfriTable" style={{ width: 36, height: 36, borderRadius: 10 }} />
            <span style={{ fontWeight: 700, fontSize: 18, color: "#F3EFE4" }}>AfriTable</span>
          </a>
          <AuthNav navKeys={navKeys} locale={locale} activeKey="nav_admin" theme="sombre" />
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
              <a
                href={`/${locale}`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontSize: 13, color: "#9BB5A5", textDecoration: "none",
                  marginBottom: 10,
                }}
              >
                <ArrowLeft size={14} />
                {t("retour_accueil")}
              </a>
              <div style={{
                width: 56, height: 3, marginBottom: 16,
                background: "linear-gradient(to right, #0F8B4C, #F59E0B)", borderRadius: 2
              }} />
              <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 800, color: "#F3EFE4" }}>
                Super Admin
              </h1>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              style={{
                padding: "12px 24px", borderRadius: 12, border: "none",
                background: "#F59E0B", color: "#F3EFE4", fontWeight: 600,
                fontSize: 14, cursor: "pointer", fontFamily: "inherit"
              }}
            >
              {showForm ? "Annuler" : "+ Ajouter un restaurant"}
            </button>
          </div>

          {/* Formulaire */}
          {showForm && (
            <div style={{
              background: "#0F3320", border: "1px solid #1D4A31", borderRadius: 16,
              padding: 28, marginBottom: 32, boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
            }}>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
                Nouveau restaurant
              </h2>
              {formError && (
                <div style={{
                  padding: "12px 16px", borderRadius: 10, marginBottom: 16,
                  background: "#501313", color: "#F09595", fontSize: 14
                }}>{formError}</div>
              )}
              {formSuccess && (
                <div style={{
                  padding: "12px 16px", borderRadius: 10, marginBottom: 16,
                  background: "#1D4A31", color: "#97C459", fontSize: 14
                }}>{formSuccess}</div>
              )}
              <form onSubmit={handleSubmit}>
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))", gap: 16
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
                        width: "100%", padding: "10px 14px", border: "2px solid #1D4A31",
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
                        width: "100%", padding: "10px 14px", border: "2px solid #1D4A31",
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
                        width: "100%", padding: "10px 14px", border: "2px solid #1D4A31",
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
                        width: "100%", padding: "10px 14px", border: "2px solid #1D4A31",
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
                        width: "100%", padding: "10px 14px", border: "2px solid #1D4A31",
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
                        width: "100%", padding: "10px 14px", border: "2px solid #1D4A31",
                        borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit",
                        boxSizing: "border-box"
                      }}
                    >
                      <option value="starter">Pack de lancement (20 000 FCFA, unique)</option>
                      <option value="business">Business (35 000 FCFA/mois)</option>
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
                        width: "100%", padding: "10px 14px", border: "2px solid #1D4A31",
                        borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit",
                        boxSizing: "border-box"
                      }}
                      placeholder="+22507070707"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                      Logo du restaurant (fourni par le restaurant)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFormLogoFile(e.target.files?.[0] || null)}
                      style={{
                        width: "100%", padding: "8px", border: "2px dashed #1D4A31",
                        borderRadius: 10, fontSize: 13, fontFamily: "inherit",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                      Localisation (obligatoire) *
                    </label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type="number"
                        step="any"
                        value={formLatitude}
                        onChange={(e) => setFormLatitude(e.target.value)}
                        style={{
                          width: "100%", padding: "10px 14px", border: "2px solid #1D4A31",
                          borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit",
                          boxSizing: "border-box"
                        }}
                        placeholder="Latitude (ex: 5.3599)"
                      />
                      <input
                        type="number"
                        step="any"
                        value={formLongitude}
                        onChange={(e) => setFormLongitude(e.target.value)}
                        style={{
                          width: "100%", padding: "10px 14px", border: "2px solid #1D4A31",
                          borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit",
                          boxSizing: "border-box"
                        }}
                        placeholder="Longitude (ex: -3.9866)"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleLocaliserAutomatiquement}
                      disabled={formLocalisationEnCours}
                      style={{
                        marginTop: 8, padding: "8px 14px", borderRadius: 10, border: "2px solid #1D4A31",
                        background: "transparent", color: "#F3EFE4", fontSize: 13, fontWeight: 500,
                        cursor: formLocalisationEnCours ? "not-allowed" : "pointer", fontFamily: "inherit"
                      }}
                    >
                      {formLocalisationEnCours ? "Localisation en cours..." : "📍 Me localiser (sur place)"}
                    </button>
                    {formLocalisationError && (
                      <p style={{ color: "#F87171", fontSize: 12, marginTop: 6 }}>{formLocalisationError}</p>
                    )}
                    <p style={{ fontSize: 11, color: "#9BB5A5", marginTop: 6 }}>
                      Requis pour que le restaurant apparaisse dans la recherche "pres de moi" cote client.
                      Utilisez ce bouton si vous etes sur place, ou saisissez les coordonnees relevees sur
                      Google Maps.
                    </p>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                      Couleurs de la fiche restaurant
                    </label>
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="color"
                          value={formCouleurPrimaire}
                          onChange={(e) => setFormCouleurPrimaire(e.target.value)}
                          style={{ width: 40, height: 40, border: "2px solid #1D4A31", borderRadius: 8, padding: 0, cursor: "pointer" }}
                        />
                        <span style={{ fontSize: 12, color: "#9BB5A5" }}>Primaire</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="color"
                          value={formCouleurSecondaire}
                          onChange={(e) => setFormCouleurSecondaire(e.target.value)}
                          style={{ width: 40, height: 40, border: "2px solid #1D4A31", borderRadius: 8, padding: 0, cursor: "pointer" }}
                        />
                        <span style={{ fontSize: 12, color: "#9BB5A5" }}>Secondaire</span>
                      </div>
                    </div>
                    <p style={{ fontSize: 11, color: "#9BB5A5", marginTop: 6 }}>
                      Par defaut : theme AfriTable (orange/vert). Le restaurant peut avoir sa propre identite.
                    </p>
                  </div>
                </div>
                <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
                  <button
                    type="submit"
                    disabled={formLoading}
                    style={{
                      padding: "12px 28px", borderRadius: 12, border: "none",
                      background: formLoading ? "#9BB5A5" : "#F59E0B", color: "#F3EFE4",
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
                      border: "2px solid #1D4A31", background: "#0F3320",
                      color: "#9BB5A5", fontWeight: 600, fontSize: 14,
                      cursor: "pointer", fontFamily: "inherit"
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Avis plateforme - total likes clients + temoignages proprietaires uniquement */}
          {avisPlateforme && (
            <div style={{
              background: "#0F3320", border: "1px solid #1D4A31", borderRadius: 16,
              padding: 24, marginBottom: 32,
              boxShadow: "0 2px 8px rgba(31,41,55,0.06)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
                <h3 style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, margin: 0 }}>
                  {t("admin_avis_titre")}
                </h3>
                <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "system-ui, -apple-system, sans-serif" }}>
                  {avisPlateforme.pourcentageSatisfaction != null ? `${avisPlateforme.pourcentageSatisfaction}%` : "—"}
                  {" "}
                  <span style={{ fontSize: 13, fontWeight: 400, color: "#9BB5A5" }}>
                    ({avisPlateforme.totalLikes}/{avisPlateforme.totalAvisClients} {t("dash_avis_likes")})
                  </span>
                </span>
              </div>

              {avisPlateforme.temoignagesProprietaires.length > 0 && (
                <>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#9BB5A5", marginBottom: 10 }}>
                    {t("admin_temoignages_titre")}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {avisPlateforme.temoignagesProprietaires.map((tem) => (
                      <div key={tem.id} style={{
                        padding: "10px 14px", borderRadius: 10, background: "#0B2818",
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
                  border: "1px solid #1D4A31", background: "#0F3320",
                  fontSize: 13, fontWeight: 600, color: "#9BB5A5",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {showModeration ? t("admin_moderation_fermer") : t("admin_moderation_ouvrir")}
              </button>

              {showModeration && (
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflow: "auto" }}>
                  {avisModeration.length === 0 ? (
                    <p style={{ fontSize: 13, color: "#9BB5A5" }}>{t("admin_moderation_vide")}</p>
                  ) : (
                    avisModeration.map((a) => (
                      <div key={a.id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        gap: 12, padding: "10px 14px", borderRadius: 10,
                        background: a.visible ? "#0B2818" : "#501313",
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
                            background: a.visible ? "#501313" : "#1D4A31",
                            color: a.visible ? "#F09595" : "#97C459",
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

          {/* Vue d'ensemble plateforme : KPIs, courbe CA, carte, activite temps reel, assistant IA */}
          <VueEnsemble />

          {/* Tarifs d'abonnement plateforme - visibles uniquement par le super_admin */}
          <div style={{
            background: "#0F3320", borderRadius: 16, padding: 24, marginBottom: 32,
            boxShadow: "0 2px 8px rgba(31,41,55,0.06)",
          }}>
            <h3 style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
              {t("admin_tarifs_plateforme_titre")}
            </h3>
            <p style={{ fontSize: 12, color: "#9BB5A5", marginBottom: 16 }}>
              {t("admin_tarifs_plateforme_note")}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              <div style={{ padding: 16, borderRadius: 12, background: "#0B2818" }}>
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Pack de lancement</p>
                <p style={{ fontSize: 20, fontWeight: 800, fontFamily: "system-ui, sans-serif" }}>20 000 <span style={{ fontSize: 12, fontWeight: 400, color: "#9BB5A5" }}>FCFA (unique)</span></p>
              </div>
              <div style={{ padding: 16, borderRadius: 12, background: "#412402" }}>
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Business</p>
                <p style={{ fontSize: 20, fontWeight: 800, fontFamily: "system-ui, sans-serif" }}>35 000 <span style={{ fontSize: 12, fontWeight: 400, color: "#9BB5A5" }}>FCFA/mois</span></p>
              </div>
              <div style={{ padding: 16, borderRadius: 12, background: "#2A1D45" }}>
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Groupe/Franchise</p>
                <p style={{ fontSize: 20, fontWeight: 800, fontFamily: "system-ui, sans-serif" }}>{t("admin_sur_devis")}</p>
              </div>
            </div>
          </div>

          {/* Liste restaurants */}
          <div style={{
            width: 56, height: 3, marginBottom: 16,
            background: "linear-gradient(to right, #0F8B4C, #F59E0B)", borderRadius: 2
          }} />
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 800, marginBottom: 20, color: "#F3EFE4" }}>
            Restaurants ({restaurants.length})
          </h2>

          {restaurants.length === 0 ? (
            <p style={{ color: "#9BB5A5", textAlign: "center", padding: 40 }}>
              Aucun restaurant. Cliquez sur "Ajouter un restaurant" pour commencer.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {restaurants.map((r) => {
                const tier = TIER_DETAILS[r.tier] || TIER_DETAILS.starter;
                const statutColor = STATUT_COLORS[r.statut_abonnement] || "#9BB5A5";
                return (
                  <div key={r.id} style={{
                    background: "#0F3320", border: "1px solid #1D4A31", borderRadius: 16,
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
                            <h3 style={{ fontWeight: 700, fontSize: 16, color: "#F3EFE4" }}>{r.nom}</h3>
                            <span style={{
                              padding: "2px 8px", borderRadius: 6, fontSize: 10,
                              fontWeight: 700, color: tier.color, background: tier.bg
                            }}>{r.tier.toUpperCase()}</span>
                            <span style={{
                              padding: "2px 8px", borderRadius: 6, fontSize: 10,
                              fontWeight: 700, color: statutColor, background: `${statutColor}15`
                            }}>{r.statut_abonnement}</span>
                          </div>
                          <div style={{ display: "flex", gap: 12, fontSize: 13, color: "#9BB5A5", flexWrap: "wrap" }}>
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
                            padding: "8px 16px", borderRadius: 10, border: "1px solid #1D4A31",
                            background: "#0F3320", color: "#F59E0B", fontWeight: 600,
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
                            border: `1px solid ${statutColor}`, background: "#0F3320",
                            color: statutColor, fontWeight: 600, fontSize: 13,
                            cursor: "pointer", fontFamily: "inherit"
                          }}
                        >
                          {r.statut_abonnement === "actif" ? "Suspendre" : "Activer"}
                        </button>
                        <button
                          onClick={() => setQrOuvertPour(qrOuvertPour === r.id ? null : r.id)}
                          style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "8px 16px", borderRadius: 10, border: "1px solid #1D4A31",
                            background: qrOuvertPour === r.id ? "#412402" : "#0F3320",
                            color: "#F59E0B", fontWeight: 600, fontSize: 13,
                            cursor: "pointer", fontFamily: "inherit"
                          }}
                        >
                          <QrCode size={14} />
                          QR
                        </button>
                        <label
                          style={{
                            display: "flex", alignItems: "center", gap: 6,
                            padding: "8px 16px", borderRadius: 10, border: "1px solid #1D4A31",
                            background: "#0F3320", color: "#9BB5A5", fontWeight: 600, fontSize: 13,
                            cursor: "pointer", fontFamily: "inherit"
                          }}
                        >
                          {uploadLogoEnCours === r.id ? "..." : (r.logo_url ? "Changer logo" : "Ajouter logo")}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleChangerLogoExistant(r.id, e)}
                            style={{ display: "none" }}
                          />
                        </label>
                        <button
                          onClick={() => setMenuOuvertPour(menuOuvertPour === r.id ? null : r.id)}
                          style={{
                            padding: "8px 16px", borderRadius: 10, border: "1px solid #1D4A31",
                            background: menuOuvertPour === r.id ? "#412402" : "#0F3320",
                            color: "#F59E0B", fontWeight: 600, fontSize: 13,
                            cursor: "pointer", fontFamily: "inherit"
                          }}
                        >
                          Menu
                        </button>
                        <button
                          onClick={() => {
                            if (personnalisationOuvertPour === r.id) {
                              setPersonnalisationOuvertPour(null);
                            } else {
                              setEditCouleurPrimaire(r.couleur_primaire || "#F59E0B");
                              setEditCouleurSecondaire(r.couleur_secondaire || "#3B6D11");
                              setEditLatitude(r.latitude != null ? String(r.latitude) : "");
                              setEditLongitude(r.longitude != null ? String(r.longitude) : "");
                              setPersonnalisationOuvertPour(r.id);
                            }
                          }}
                          style={{
                            padding: "8px 16px", borderRadius: 10, border: "1px solid #1D4A31",
                            background: personnalisationOuvertPour === r.id ? "#412402" : "#0F3320",
                            color: "#F59E0B", fontWeight: 600, fontSize: 13,
                            cursor: "pointer", fontFamily: "inherit"
                          }}
                        >
                          Personnaliser
                        </button>
                      </div>
                    </div>
                    {qrOuvertPour === r.id && (
                      <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #1D4A31" }}>
                        <QrCommunication
                          restaurantId={r.id}
                          slug={r.slug}
                          pays={r.pays}
                          locale={locale}
                          logoUrl={r.logo_url}
                        />
                      </div>
                    )}
                    {menuOuvertPour === r.id && (
                      <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #1D4A31" }}>
                        <GestionMenu restaurantId={r.id} slug={r.slug} pays={r.pays} locale={locale} />
                      </div>
                    )}
                    {personnalisationOuvertPour === r.id && (
                      <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #1D4A31" }}>
                        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
                          <div>
                            <label style={{ display: "block", fontSize: 12, color: "#9BB5A5", marginBottom: 6 }}>
                              Couleur primaire
                            </label>
                            <input
                              type="color"
                              value={editCouleurPrimaire}
                              onChange={(e) => setEditCouleurPrimaire(e.target.value)}
                              style={{ width: 40, height: 40, border: "2px solid #1D4A31", borderRadius: 8, padding: 0, cursor: "pointer" }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 12, color: "#9BB5A5", marginBottom: 6 }}>
                              Couleur secondaire
                            </label>
                            <input
                              type="color"
                              value={editCouleurSecondaire}
                              onChange={(e) => setEditCouleurSecondaire(e.target.value)}
                              style={{ width: 40, height: 40, border: "2px solid #1D4A31", borderRadius: 8, padding: 0, cursor: "pointer" }}
                            />
                          </div>
                          <button
                            onClick={() => handleChangerCouleurs(r.id, editCouleurPrimaire, editCouleurSecondaire)}
                            disabled={couleursEnCours === r.id}
                            style={{
                              padding: "10px 18px", borderRadius: 10, border: "none",
                              background: "#F59E0B", color: "#F3EFE4", fontWeight: 600, fontSize: 13,
                              cursor: couleursEnCours === r.id ? "not-allowed" : "pointer", fontFamily: "inherit"
                            }}
                          >
                            {couleursEnCours === r.id ? "Enregistrement..." : "Enregistrer les couleurs"}
                          </button>
                        </div>
                        <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
                          <div>
                            <label style={{ display: "block", fontSize: 12, color: "#9BB5A5", marginBottom: 6 }}>
                              Latitude
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={editLatitude}
                              onChange={(e) => setEditLatitude(e.target.value)}
                              style={{
                                padding: "10px 14px", border: "2px solid #1D4A31", borderRadius: 10,
                                fontSize: 14, outline: "none", fontFamily: "inherit", width: 160
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: 12, color: "#9BB5A5", marginBottom: 6 }}>
                              Longitude
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={editLongitude}
                              onChange={(e) => setEditLongitude(e.target.value)}
                              style={{
                                padding: "10px 14px", border: "2px solid #1D4A31", borderRadius: 10,
                                fontSize: 14, outline: "none", fontFamily: "inherit", width: 160
                              }}
                            />
                          </div>
                          <button
                            onClick={() => handleChangerLocalisation(r.id, editLatitude, editLongitude)}
                            style={{
                              padding: "10px 18px", borderRadius: 10, border: "1px solid #1D4A31",
                              background: "#0F3320", color: "#F59E0B", fontWeight: 600, fontSize: 13,
                              cursor: "pointer", fontFamily: "inherit"
                            }}
                          >
                            Enregistrer la localisation
                          </button>
                        </div>
                        {(r.latitude == null || r.longitude == null) && (
                          <p style={{ color: "#F87171", fontSize: 12, marginTop: 10 }}>
                            ⚠ Ce restaurant n'a pas encore de localisation — il n'apparaitra pas dans la
                            recherche "pres de moi" cote client tant qu'elle n'est pas renseignee.
                          </p>
                        )}
                      </div>
                    )}
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