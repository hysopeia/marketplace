
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showReservation, setShowReservation] = useState(false);
  const [resDate, setResDate] = useState("");
  const [resTime, setResTime] = useState("");
  const [resGuests, setResGuests] = useState(2);

  const navKeys = ["nav_home", "nav_restaurants", "nav_pricing", "nav_dashboard"];

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

  const joursSemaine = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

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
                  color: key === "nav_restaurants" ? "#C75B39" : "#6B7280",
                  background:
                    key === "nav_restaurants"
                      ? "rgba(27,67,50,0.06)"
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

      {/* Banniere restaurant */}
      <div
        style={{
          height: 320,
          background: "linear-gradient(135deg, #C75B39, #26221C)",
          position: "relative",
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)",
          }}
        />
        <div
          style={{
            position: "relative",
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 24px 24px",
            width: "100%",
            display: "flex",
            alignItems: "flex-end",
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
              color: "#C75B39",
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

      {/* Actions principales */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 24px 0" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
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
                background: "linear-gradient(135deg, #C75B39, #2d5a3f)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 24,
                flexShrink: 0,
              }}
            >
              📅
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
                {t("resto_reserve")}
              </h3>
              <p style={{ fontSize: 13, color: "#6B7280" }}>
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
                background: "linear-gradient(135deg, #E8A93B, #B8860B)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 24,
                flexShrink: 0,
              }}
            >
              🛍️
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
              background: "linear-gradient(to right, #E8A93B, #C75B39)",
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
                    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
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
                              color: "#C75B39",
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
                            background: "#C75B39",
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
            background: "#C75B39",
            color: "white",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 8px 32px rgba(27,67,50,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
          }}
        >
          🛒
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "#C75B39",
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
                <button
                  style={{
                    width: "100%",
                    padding: "14px 0",
                    borderRadius: 12,
                    border: "none",
                    background: "#C75B39",
                    color: "white",
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: "pointer",
                  }}
                >
                  {t("cart_checkout")}
                </button>
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

              <button
                style={{
                  width: "100%",
                  padding: "14px 0",
                  borderRadius: 12,
                  border: "none",
                  background: "#C75B39",
                  color: "white",
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: "pointer",
                  marginTop: 8,
                }}
                onClick={() => {
                  alert(
                    `Reservation: ${resDate} ${resTime}, ${resGuests} ${t("guests_label")}\n\nEn production, cela enverrait vers le provider de paiement puis creerait la reservation en base.`
                  );
                }}
              >
                {t("res_confirm")}
              </button>
            </div>
          </div>
        </>
      )}

      <div style={{ height: 80 }} />
    </div>
  );
}