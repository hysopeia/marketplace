
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarCheck, ShoppingBag, ShoppingCart, ThumbsUp, ThumbsDown, MapPin } from "lucide-react";
import AuthNav from "@/components/AuthNav";
import EngagementClient from "@/components/EngagementClient";
import Footer from "@/components/Footer";

type MenuItem = {
  id: string;
  prix: number;
  photo_url: string;
  nom: string;
  description: string;
};

type Categorie = {
  id: string;
  nom: string;
  items: MenuItem[];
};

type Creneau = {
  id: string;
  jour_semaine: number;
  heure_debut: string;
  heure_fin: string;
  capacite_totale: number;
};

type Restaurant = {
  id: string;
  slug: string;
  nom: string;
  description: string;
  pays: string;
  ville: string;
  quartier: string;
  tier: string;
  devise: string;
  logo_url: string;
  acompte_actif: boolean;
  acompte_pourcentage: number;
  paiement_sur_place: boolean;
  couleur_primaire?: string | null;
  couleur_secondaire?: string | null;
};

type CartItem = MenuItem & { quantite: number };

function getNavHref(key: string, locale: string): string {
  if (key === "nav_home") return `/${locale}`;
  if (key === "nav_restaurants") return `/${locale}/restaurants`;
  if (key === "nav_pricing") return `/${locale}/pricing`;
  if (key === "nav_dashboard") return `/${locale}/dashboard`;
  return `/${locale}`;
}

function formatPrice(amount: number, devise: string): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + " " + devise;
}

export default function RestaurantDetail({
  restaurant,
  menu,
  creneaux,
  locale,
}: {
  restaurant: Restaurant;
  menu: Categorie[];
  creneaux: Creneau[];
  locale: string;
}) {
  const t = useTranslations();
  // Le restaurant peut avoir sa propre identite visuelle ; a defaut,
  // on retombe sur le theme AfriTable standard (orange/vert).
  const couleurPrimaire = restaurant.couleur_primaire || "#F59E0B";
  const couleurSecondaire = restaurant.couleur_secondaire || "#3B6D11";
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showReservation, setShowReservation] = useState(false);
  const [resDate, setResDate] = useState("");
  const [resTime, setResTime] = useState("");
  const [resGuests, setResGuests] = useState(2);
  const [resPhone, setResPhone] = useState("");
  const [resNom, setResNom] = useState("");
  const [resLoading, setResLoading] = useState(false);
  const [resError, setResError] = useState("");
  const [resSuccess, setResSuccess] = useState(false);

  const [cartPhone, setCartPhone] = useState("");
  const [cartNom, setCartNom] = useState("");
  const [cartHeureRetrait, setCartHeureRetrait] = useState("");
  const [cartType, setCartType] = useState<"retrait" | "sur_place" | "livraison">("retrait");
  const [cartAdresseLivraison, setCartAdresseLivraison] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState("");
  const [cartSuccess, setCartSuccess] = useState(false);

  const [avisPositif, setAvisPositif] = useState<boolean | null>(null);
  const [avisNom, setAvisNom] = useState("");
  const [avisCommentaire, setAvisCommentaire] = useState("");
  const [avisLoading, setAvisLoading] = useState(false);
  const [avisSuccess, setAvisSuccess] = useState(false);
  const [avisError, setAvisError] = useState("");

  // Memorise la derniere commande/reservation confirmee dans cette session,
  // pour rattacher l'avis client a une transaction reelle (avis "verifie").
  const [derniereCommandeId, setDerniereCommandeId] = useState<string | null>(null);
  const [derniereReservationId, setDerniereReservationId] = useState<string | null>(null);

  const navKeys = ["nav_home", "nav_restaurants", "nav_pricing", "nav_dashboard", "nav_admin", "nav_login"];

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.id === item.id ? { ...c, quantite: c.quantite + 1 } : c
        );
      }
      return [...prev, { ...item, quantite: 1 }];
    });
  }

  function removeFromCart(itemId: string) {
    setCart((prev) => prev.filter((c) => c.id !== itemId));
  }

  function updateQuantity(itemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) =>
          c.id === itemId ? { ...c, quantite: Math.max(0, c.quantite + delta) } : c
        )
        .filter((c) => c.quantite > 0)
    );
  }

  const cartTotal = cart.reduce((s, i) => s + i.prix * i.quantite, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantite, 0);

  async function handleConfirmReservation() {
    setResError("");

    if (!resDate || !resTime || !resPhone) {
      setResError(t("champs_requis"));
      return;
    }

    setResLoading(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          date: resDate,
          heure: resTime,
          nbPersonnes: resGuests,
          clientTelephone: resPhone,
          clientNom: resNom || null,
          clientLangue: locale,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setResError(data.error || t("erreur_generique"));
        setResLoading(false);
        return;
      }

      setResSuccess(true);
      setResLoading(false);
      if (data?.id) setDerniereReservationId(data.id);

      // Ferme la modale et reinitialise le formulaire apres un court delai,
      // pour laisser le temps au client de voir la confirmation.
      setTimeout(() => {
        setShowReservation(false);
        setResSuccess(false);
        setResDate("");
        setResTime("");
        setResGuests(2);
        setResPhone("");
        setResNom("");
      }, 2200);
    } catch (err) {
      setResError(t("erreur_generique"));
      setResLoading(false);
    }
  }

  function handlePartagerPosition() {
    setGeoError("");
    if (!navigator.geolocation) {
      setGeoError(t("cart_geoloc_non_supportee"));
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const lienMaps = `https://maps.google.com/?q=${latitude},${longitude}`;
        setCartAdresseLivraison((prev) => (prev ? `${prev}\n${lienMaps}` : lienMaps));
        setGeoLoading(false);
      },
      () => {
        setGeoError(t("cart_geoloc_refusee"));
        setGeoLoading(false);
      }
    );
  }

  async function handleConfirmCommande() {
    setCartError("");

    if (!cartPhone || !cartHeureRetrait) {
      setCartError(t("champs_requis"));
      return;
    }

    if (cartType === "livraison" && !cartAdresseLivraison.trim()) {
      setCartError(t("cart_adresse_requise"));
      return;
    }

    setCartLoading(true);
    try {
      const res = await fetch("/api/commandes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          items: cart.map((item) => ({
            menu_item_id: item.id,
            quantite: item.quantite,
            prix_unitaire: item.prix,
          })),
          type: cartType,
          heureRetrait: new Date(cartHeureRetrait).toISOString(),
          clientTelephone: cartPhone,
          clientNom: cartNom || null,
          clientLangue: locale,
          adresseLivraison: cartType === "livraison" ? cartAdresseLivraison : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setCartError(data.error || t("erreur_generique"));
        setCartLoading(false);
        return;
      }

      setCartSuccess(true);
      setCart([]);
      setCartLoading(false);
      if (data?.id) setDerniereCommandeId(data.id);

      // Ferme le panier et reinitialise apres un court delai.
      setTimeout(() => {
        setShowCart(false);
        setCartSuccess(false);
        setCartPhone("");
        setCartNom("");
        setCartHeureRetrait("");
        setCartType("retrait");
        setCartAdresseLivraison("");
        setGeoError("");
      }, 2200);
    } catch (err) {
      setCartError(t("erreur_generique"));
      setCartLoading(false);
    }
  }

  const joursSemaine = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

  async function handleSubmitAvis() {
    setAvisError("");

    if (avisPositif === null) {
      setAvisError(t("champs_requis"));
      return;
    }

    setAvisLoading(true);
    try {
      const res = await fetch("/api/avis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          auteurType: "client",
          auteurNom: avisNom || null,
          positif: avisPositif,
          commentaire: avisCommentaire || null,
          commandeId: derniereCommandeId,
          reservationId: derniereReservationId,
        }),
      });

      if (!res.ok) {
        setAvisError(t("erreur_generique"));
        setAvisLoading(false);
        return;
      }

      setAvisSuccess(true);
      setAvisLoading(false);
    } catch (err) {
      setAvisError(t("erreur_generique"));
      setAvisLoading(false);
    }
  }

  const creneauxForDate = resDate
    ? creneaux.filter((c) => c.jour_semaine === new Date(resDate + "T12:00:00").getDay())
    : [];

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
          <AuthNav navKeys={navKeys} locale={locale} activeKey="nav_restaurants" />
        </div>
      </header>

      {/* Banniere restaurant */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 24px 0" }}>
        <div
          className="banniere-resto"
          style={{
            height: 240,
            borderRadius: 16,
            position: "relative",
            display: "flex",
            overflow: "hidden",
          }}
        >
          <div className="banniere-resto-photo" style={{
            width: 280, flexShrink: 0,
            background: "#0B2818",
          }}>
            <img
              src="/images/chef-cuisine.jpg"
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 25%" }}
            />
          </div>
          <div
            style={{
              flex: 1,
              position: "relative",
              padding: "24px",
              width: "100%",
              display: "flex",
              alignItems: "flex-end",
              background: `linear-gradient(135deg, ${couleurPrimaire} 0%, #123B26 60%, #0B2818 100%)`,
              gap: 16,
            }}
          >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 700,
              color: couleurPrimaire,
              border: "4px solid white",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              flexShrink: 0,
            }}
          >
            {restaurant.logo_url ? (
              <img
                src={restaurant.logo_url}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: 12,
                  objectFit: "cover",
                }}
              />
            ) : (
              restaurant.nom.charAt(0)
            )}
          </div>
          <div style={{ flex: 1 }}>
            <h1
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 32,
                fontWeight: 800,
                color: "white",
                marginBottom: 4,
              }}
            >
              {restaurant.nom}
            </h1>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>
              {restaurant.description}
            </p>
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 8,
                fontSize: 13,
                color: "rgba(255,255,255,0.6)",
              }}
            >
              <span>
                {restaurant.ville}, {restaurant.quartier} — {restaurant.pays}
              </span>
              <span>{restaurant.devise}</span>
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                }}
              >
                {restaurant.tier.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
      </div>

      <EngagementClient restaurantId={restaurant.id} restaurantNom={restaurant.nom} />

      {/* Actions principales */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 24px 0" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
            gap: 16,
            marginBottom: 48,
          }}
        >
          <button
            onClick={() => setShowReservation(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: 24,
              background: "#0B2818",
              border: "1px solid #0B2818",
              borderRadius: 16,
              cursor: "pointer",
              textAlign: "left",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: couleurPrimaire,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 24,
                flexShrink: 0,
              }}
            >
              <CalendarCheck size={26} />
            </div>
            <div>
              <h3
                style={{
                  fontFamily: "Georgia, serif",
                  fontWeight: 700,
                  fontSize: 18,
                  marginBottom: 2,
                  color: "#F3EFE4",
                }}
              >
                {t("resto_reserve")}
              </h3>
              <p style={{ fontSize: 13, color: "#9BB5A5" }}>
                {restaurant.acompte_actif
                  ? t("res_confirm")
                  : t("available")}
              </p>
            </div>
          </button>

          <button
            onClick={() => {
              document.getElementById("menuSection")?.scrollIntoView({
                behavior: "smooth",
              });
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: 24,
              background: "white",
              border: "1px solid #E5E1D8",
              borderRadius: 16,
              cursor: "pointer",
              textAlign: "left",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "linear-gradient(135deg, #0F8B4C, #B8860B)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 24,
                flexShrink: 0,
              }}
            >
              <ShoppingBag size={26} />
            </div>
            <div>
              <h3
                style={{
                  fontFamily: "Georgia, serif",
                  fontWeight: 700,
                  fontSize: 18,
                  marginBottom: 2,
                  color: "#1A1A2E",
                }}
              >
                {t("resto_order")}
              </h3>
              <p style={{ fontSize: 13, color: "#6B7280" }}>
                {t("order_type_retrait")}
              </p>
            </div>
          </button>
        </div>

        {/* Menu */}
        <div id="menuSection">
          <div
            style={{
              width: 56,
              height: 3,
              marginBottom: 16,
              background: `linear-gradient(to right, ${couleurSecondaire}, ${couleurPrimaire})`,
              borderRadius: 2,
            }}
          />
          <h2
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 28,
              fontWeight: 800,
              marginBottom: 32,
              color: "#1A1A2E",
            }}
          >
            {t("resto_menu")}
          </h2>

          {menu.length === 0 ? (
            <p style={{ color: "#6B7280" }}>
              Aucun plat disponible pour le moment.
            </p>
          ) : (
            menu.map((cat) => (
              <div key={cat.id} style={{ marginBottom: 40 }}>
                <h3
                  style={{
                    fontWeight: 700,
                    fontSize: 20,
                    marginBottom: 16,
                    color: "#1A1A2E",
                  }}
                >
                  {cat.nom}
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))",
                    gap: 16,
                  }}
                >
                  {cat.items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        background: "white",
                        border: "1px solid #E5E1D8",
                        borderRadius: 16,
                        overflow: "hidden",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                      }}
                    >
                      {item.photo_url ? (
                        <div style={{ height: 160, overflow: "hidden" }}>
                          <img
                            src={item.photo_url}
                            alt={item.nom}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            height: 80,
                            background: "#F3F4F6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#9CA3AF",
                            fontSize: 13,
                          }}
                        >
                          Pas de photo
                        </div>
                      )}
                      <div style={{ padding: 16 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: 8,
                            marginBottom: 4,
                          }}
                        >
                          <h4
                            style={{
                              fontWeight: 600,
                              fontSize: 15,
                              color: "#1A1A2E",
                            }}
                          >
                            {item.nom}
                          </h4>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: 15,
                              color: couleurPrimaire,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatPrice(item.prix, restaurant.devise)}
                          </span>
                        </div>
                        {item.description && (
                          <p
                            style={{
                              fontSize: 13,
                              color: "#6B7280",
                              marginBottom: 12,
                            }}
                          >
                            {item.description}
                          </p>
                        )}
                        <button
                          onClick={() => addToCart(item)}
                          style={{
                            width: "100%",
                            padding: "10px 0",
                            borderRadius: 10,
                            border: "none",
                            background: couleurPrimaire,
                            color: "white",
                            fontWeight: 600,
                            fontSize: 14,
                            cursor: "pointer",
                          }}
                        >
                          {t("cart_add")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Formulaire d'avis client */}
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px 48px" }}>
          <div
            style={{
              background: "white",
              border: "1px solid #E5E1D8",
              borderRadius: 16,
              padding: 24,
            }}
          >
            <h3
              style={{
                fontFamily: "Georgia, serif",
                fontWeight: 700,
                fontSize: 18,
                marginBottom: 16,
              }}
            >
              {t("avis_titre")}
            </h3>

            {(derniereCommandeId || derniereReservationId) && !avisSuccess && (
              <p
                style={{
                  fontSize: 12,
                  color: couleurSecondaire,
                  background: "#EAF3DE",
                  display: "inline-block",
                  padding: "4px 10px",
                  borderRadius: 20,
                  fontWeight: 600,
                  marginBottom: 12,
                }}
              >
                ✓ {t("avis_sera_verifie")}
              </p>
            )}

            {avisSuccess ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "16px 0",
                  borderRadius: 12,
                  background: "#EAF3DE",
                  color: couleurSecondaire,
                  fontWeight: 600,
                }}
              >
                {t("avis_merci")}
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  <button
                    onClick={() => setAvisPositif(true)}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "12px 0",
                      borderRadius: 12,
                      border: avisPositif === true ? "2px solid #3B6D11" : "2px solid #E5E1D8",
                      background: avisPositif === true ? "#EAF3DE" : "white",
                      color: avisPositif === true ? couleurSecondaire : "#6B7280",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontFamily: "inherit",
                    }}
                  >
                    <ThumbsUp size={18} />
                    {t("avis_jaime")}
                  </button>
                  <button
                    onClick={() => setAvisPositif(false)}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "12px 0",
                      borderRadius: 12,
                      border: avisPositif === false ? "2px solid #991B1B" : "2px solid #E5E1D8",
                      background: avisPositif === false ? "#FEF2F2" : "white",
                      color: avisPositif === false ? "#991B1B" : "#6B7280",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontFamily: "inherit",
                    }}
                  >
                    <ThumbsDown size={18} />
                    {t("avis_jaime_pas")}
                  </button>
                </div>

                <input
                  type="text"
                  value={avisNom}
                  onChange={(e) => setAvisNom(e.target.value)}
                  placeholder={t("res_nom")}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "2px solid #E5E1D8",
                    borderRadius: 10,
                    fontSize: 14,
                    outline: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    marginBottom: 10,
                  }}
                />

                <textarea
                  value={avisCommentaire}
                  onChange={(e) => setAvisCommentaire(e.target.value)}
                  placeholder={t("avis_commentaire_placeholder")}
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "2px solid #E5E1D8",
                    borderRadius: 10,
                    fontSize: 14,
                    outline: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    marginBottom: 12,
                    resize: "vertical",
                  }}
                />

                {avisError && (
                  <p style={{ fontSize: 13, color: "#B91C1C", marginBottom: 12 }}>{avisError}</p>
                )}

                <button
                  disabled={avisLoading}
                  onClick={handleSubmitAvis}
                  style={{
                    width: "100%",
                    padding: "12px 0",
                    borderRadius: 12,
                    border: "none",
                    background: avisLoading ? "#9CA3AF" : couleurPrimaire,
                    color: "white",
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: avisLoading ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {avisLoading ? t("chargement") : t("avis_envoyer")}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bouton panier flottant */}
      {cartCount > 0 && (
        <button
          onClick={() => setShowCart(true)}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 100,
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: couleurPrimaire,
            color: "white",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 8px 32px rgba(245,158,11,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
          }}
        >
          <ShoppingCart size={24} />
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: couleurPrimaire,
              color: "white",
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #FDF8F0",
            }}
          >
            {cartCount}
          </span>
        </button>
      )}

      {/* Panneau panier */}
      {showCart && (
        <>
          <div
            onClick={() => setShowCart(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
              zIndex: 200,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              width: 400,
              maxWidth: "92vw",
              height: "100vh",
              background: "white",
              zIndex: 201,
              boxShadow: "-8px 0 40px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "20px 24px",
                borderBottom: "1px solid #E5E1D8",
              }}
            >
              <h3
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                {t("cart_title")}
              </h3>
              <button
                onClick={() => setShowCart(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: "1px solid #E5E1D8",
                  background: "white",
                  cursor: "pointer",
                  fontSize: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
              {cart.length === 0 ? (
                <p style={{ color: "#6B7280", textAlign: "center", marginTop: 40 }}>
                  {t("cart_empty")}
                </p>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "12px 0",
                      borderBottom: "1px solid #E5E1D8",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 500, fontSize: 14 }}>{item.nom}</p>
                      <p style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                        {formatPrice(item.prix, restaurant.devise)}
                      </p>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          border: "1px solid #E5E1D8",
                          background: "white",
                          cursor: "pointer",
                          fontSize: 14,
                        }}
                      >
                        -
                      </button>
                      <span style={{ fontWeight: 600, fontSize: 14, width: 20, textAlign: "center" }}>
                        {item.quantite}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          border: "1px solid #E5E1D8",
                          background: "white",
                          cursor: "pointer",
                          fontSize: 14,
                        }}
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#991B1B",
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div
                style={{
                  padding: "20px 24px",
                  borderTop: "1px solid #E5E1D8",
                }}
              >
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                    {t("res_phone")}
                  </label>
                  <input
                    type="tel"
                    value={cartPhone}
                    onChange={(e) => setCartPhone(e.target.value)}
                    placeholder="+225 XX XX XX XX XX"
                    style={{
                      width: "100%", padding: "10px 14px", border: "2px solid #E5E1D8",
                      borderRadius: 10, fontSize: 14, outline: "none",
                      fontFamily: "inherit", boxSizing: "border-box", marginBottom: 10,
                    }}
                  />
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                    {t("res_nom")}
                  </label>
                  <input
                    type="text"
                    value={cartNom}
                    onChange={(e) => setCartNom(e.target.value)}
                    style={{
                      width: "100%", padding: "10px 14px", border: "2px solid #E5E1D8",
                      borderRadius: 10, fontSize: 14, outline: "none",
                      fontFamily: "inherit", boxSizing: "border-box", marginBottom: 10,
                    }}
                  />
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                    {t("cart_type_label")}
                  </label>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <button
                      type="button"
                      onClick={() => setCartType("retrait")}
                      style={{
                        flex: 1, padding: "8px 0", borderRadius: 8,
                        border: cartType === "retrait" ? "2px solid #F59E0B" : "2px solid #E5E1D8",
                        background: cartType === "retrait" ? "#FFFBEB" : "white",
                        color: cartType === "retrait" ? couleurPrimaire : "#6B7280",
                        fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      {t("order_type_retrait")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCartType("livraison")}
                      style={{
                        flex: 1, padding: "8px 0", borderRadius: 8,
                        border: cartType === "livraison" ? "2px solid #F59E0B" : "2px solid #E5E1D8",
                        background: cartType === "livraison" ? "#FFFBEB" : "white",
                        color: cartType === "livraison" ? couleurPrimaire : "#6B7280",
                        fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      {t("dash_livraison")}
                    </button>
                  </div>

                  {cartType === "livraison" && (
                    <>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                        {t("cart_adresse_livraison")}
                      </label>
                      <textarea
                        value={cartAdresseLivraison}
                        onChange={(e) => setCartAdresseLivraison(e.target.value)}
                        placeholder={t("cart_adresse_placeholder")}
                        rows={2}
                        style={{
                          width: "100%", padding: "10px 14px", border: "2px solid #E5E1D8",
                          borderRadius: 10, fontSize: 14, outline: "none",
                          fontFamily: "inherit", boxSizing: "border-box", marginBottom: 8, resize: "vertical",
                        }}
                      />
                      <button
                        type="button"
                        onClick={handlePartagerPosition}
                        disabled={geoLoading}
                        style={{
                          display: "flex", alignItems: "center", gap: 6, marginBottom: 10,
                          padding: "7px 12px", borderRadius: 8, border: "1px solid #F59E0B",
                          background: "white", color: couleurPrimaire, fontSize: 12, fontWeight: 600,
                          cursor: geoLoading ? "default" : "pointer", fontFamily: "inherit",
                        }}
                      >
                        <MapPin size={13} />
                        {geoLoading ? t("cart_localisation_en_cours") : t("cart_partager_position")}
                      </button>
                      {geoError && (
                        <p style={{ fontSize: 11, color: "#B91C1C", marginBottom: 10 }}>{geoError}</p>
                      )}
                      <p style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 10 }}>
                        {t("cart_livraison_note")}
                      </p>
                    </>
                  )}

                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                    {t("cart_heure_retrait")}
                  </label>
                  <input
                    type="datetime-local"
                    value={cartHeureRetrait}
                    onChange={(e) => setCartHeureRetrait(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    style={{
                      width: "100%", padding: "10px 14px", border: "2px solid #E5E1D8",
                      borderRadius: 10, fontSize: 14, outline: "none",
                      fontFamily: "inherit", boxSizing: "border-box",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <span style={{ fontWeight: 500, color: "#6B7280" }}>
                    {t("cart_total")}
                  </span>
                  <span
                    style={{
                      fontFamily: "Georgia, serif",
                      fontWeight: 700,
                      fontSize: 20,
                    }}
                  >
                    {formatPrice(cartTotal, restaurant.devise)}
                  </span>
                </div>

                {cartError && (
                  <p style={{ fontSize: 13, color: "#B91C1C", marginBottom: 12 }}>{cartError}</p>
                )}

                {cartSuccess ? (
                  <div style={{
                    textAlign: "center", padding: "14px 0", borderRadius: 12,
                    background: "#EAF3DE", color: couleurSecondaire, fontWeight: 600,
                  }}>
                    {t("commande_confirmee")}
                  </div>
                ) : (
                  <button
                    disabled={cartLoading}
                    style={{
                      width: "100%",
                      padding: "14px 0",
                      borderRadius: 12,
                      border: "none",
                      background: cartLoading ? "#9CA3AF" : couleurPrimaire,
                      color: "white",
                      fontWeight: 600,
                      fontSize: 15,
                      cursor: cartLoading ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                    }}
                    onClick={handleConfirmCommande}
                  >
                    {cartLoading ? t("chargement") : t("cart_checkout")}
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal reservation */}
      {showReservation && (
        <>
          <div
            onClick={() => setShowReservation(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(4px)",
              zIndex: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 480,
              maxWidth: "92vw",
              background: "white",
              borderRadius: 20,
              padding: 32,
              zIndex: 201,
              boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
              maxHeight: "90vh",
              overflow: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 24,
              }}
            >
              <h2
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: 22,
                  fontWeight: 700,
                }}
              >
                {t("resto_reserve")}
              </h2>
              <button
                onClick={() => setShowReservation(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: "1px solid #E5E1D8",
                  background: "white",
                  cursor: "pointer",
                  fontSize: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 500,
                    marginBottom: 6,
                  }}
                >
                  {t("res_date")}
                </label>
                <input
                  type="date"
                  value={resDate}
                  onChange={(e) => {
                    setResDate(e.target.value);
                    setResTime("");
                  }}
                  min={new Date().toISOString().split("T")[0]}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "2px solid #E5E1D8",
                    borderRadius: 12,
                    fontSize: 15,
                    outline: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 500,
                    marginBottom: 6,
                  }}
                >
                  {t("res_time")}
                </label>
                <select
                  value={resTime}
                  onChange={(e) => setResTime(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "2px solid #E5E1D8",
                    borderRadius: 12,
                    fontSize: 15,
                    outline: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="">--</option>
                  {creneauxForDate.map((c) => (
                    <option key={c.id} value={c.heure_debut}>
                      {joursSemaine[c.jour_semaine]} {c.heure_debut} - {c.heure_fin} ({c.capacite_totale} {t("available")})
                    </option>
                  ))}
                </select>
                {resDate && creneauxForDate.length === 0 && (
                  <p style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
                    {t("full")}
                  </p>
                )}
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 500,
                    marginBottom: 6,
                  }}
                >
                  {t("res_guests")}
                </label>
                <select
                  value={resGuests}
                  onChange={(e) => setResGuests(parseInt(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "2px solid #E5E1D8",
                    borderRadius: 12,
                    fontSize: 15,
                    outline: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} {t("guests_label")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 500,
                    marginBottom: 6,
                  }}
                >
                  {t("res_phone")}
                </label>
                <input
                  type="tel"
                  value={resPhone}
                  onChange={(e) => setResPhone(e.target.value)}
                  placeholder="+225 XX XX XX XX XX"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "2px solid #E5E1D8",
                    borderRadius: 12,
                    fontSize: 15,
                    outline: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 14,
                    fontWeight: 500,
                    marginBottom: 6,
                  }}
                >
                  {t("res_nom")}
                </label>
                <input
                  type="text"
                  value={resNom}
                  onChange={(e) => setResNom(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: "2px solid #E5E1D8",
                    borderRadius: 12,
                    fontSize: 15,
                    outline: "none",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {resError && (
                <p style={{ fontSize: 13, color: "#B91C1C", margin: 0 }}>{resError}</p>
              )}

              {resSuccess ? (
                <div style={{
                  textAlign: "center", padding: "16px 0", borderRadius: 12,
                  background: "#EAF3DE", color: couleurSecondaire, fontWeight: 600,
                }}>
                  {t("res_confirmee")}
                </div>
              ) : (
                <button
                  disabled={resLoading}
                  style={{
                    width: "100%",
                    padding: "14px 0",
                    borderRadius: 12,
                    border: "none",
                    background: resLoading ? "#9CA3AF" : couleurPrimaire,
                    color: "white",
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: resLoading ? "not-allowed" : "pointer",
                    marginTop: 8,
                    fontFamily: "inherit",
                  }}
                  onClick={handleConfirmReservation}
                >
                  {resLoading ? t("chargement") : t("res_confirm")}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <div style={{ height: 80 }} />

      <style jsx>{`
        @media (max-width: 640px) {
          .banniere-resto {
            height: auto !important;
            flex-direction: column !important;
          }
          .banniere-resto-photo {
            width: 100% !important;
            height: 140px !important;
          }
        }
      `}</style>

      <Footer locale={locale} />
    </div>
  );
}