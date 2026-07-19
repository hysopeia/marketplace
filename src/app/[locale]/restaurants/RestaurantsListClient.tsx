"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { MapPin, LocateFixed, Search, ThumbsUp, UtensilsCrossed } from "lucide-react";
import { distanceKm } from "@/lib/geo/haversine";

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
  latitude: number | null;
  longitude: number | null;
  satisfaction: number | null;
};

type GeoStatus = "idle" | "loading" | "granted" | "denied" | "unavailable";

const tierColors: Record<string, string> = {
  starter: "#3B82F6",
  business: "#0F8B4C",
  groupe: "#A855F7",
};

const tierBg: Record<string, string> = {
  starter: "#EFF6FF",
  business: "#FFFBEB",
  groupe: "#FAF5FF",
};

export default function RestaurantsListClient({
  restaurants,
  locale,
  initialQuery,
}: {
  restaurants: Restaurant[];
  locale: string;
  initialQuery?: string;
}) {
  const t = useTranslations();
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const [recherche, setRecherche] = useState(initialQuery || "");

  function demanderLocalisation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("unavailable");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus("granted");
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  // Tentative automatique au chargement — repli propre si refus/indisponible,
  // voir le bandeau + bouton manuel plus bas.
  useEffect(() => {
    demanderLocalisation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restaurantsAffiches = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    const filtres = q
      ? restaurants.filter(
          (r) =>
            r.nom.toLowerCase().includes(q) ||
            r.ville?.toLowerCase().includes(q) ||
            r.quartier?.toLowerCase().includes(q)
        )
      : restaurants;

    const avecDistance = filtres.map((r) => ({
      ...r,
      distance:
        position && r.latitude != null && r.longitude != null
          ? distanceKm(position.lat, position.lng, r.latitude, r.longitude)
          : null,
    }));

    if (!position) return avecDistance;

    return avecDistance.sort((a, b) => {
      if (a.distance == null && b.distance == null) return 0;
      if (a.distance == null) return 1;
      if (b.distance == null) return -1;
      return a.distance - b.distance;
    });
  }, [restaurants, position, recherche]);

  if (restaurants.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px", color: "#6B7280" }}>
        <p style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>
          {t("dash_no_ord")}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Recherche */}
      <div style={{ position: "relative", maxWidth: 420, marginBottom: 24 }}>
        <Search size={17} color="#9CA3AF" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
        <input
          type="text"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un restaurant, une ville..."
          style={{
            width: "100%", padding: "12px 14px 12px 40px", borderRadius: 12,
            border: "1px solid #E5E1D8", fontSize: 14, outline: "none",
            fontFamily: "inherit", background: "white", color: "#1F2937",
            boxSizing: "border-box", boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        />
      </div>

      {geoStatus !== "granted" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            background: "#FAEEDA",
            borderRadius: 12,
            padding: "12px 18px",
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <MapPin size={18} color="#854F0B" />
            <span style={{ fontSize: 14, color: "#854F0B" }}>
              {geoStatus === "loading" ? t("geoloc_recherche") : t("geoloc_invite")}
            </span>
          </div>
          {geoStatus !== "loading" && (
            <button
              onClick={demanderLocalisation}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: "#F59E0B",
                color: "white",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <LocateFixed size={14} />
              {t("geoloc_activer")}
            </button>
          )}
        </div>
      )}

      {restaurantsAffiches.length === 0 ? (
        <p style={{ textAlign: "center", color: "#6B7280", padding: "40px 0" }}>
          Aucun restaurant ne correspond a "{recherche}".
        </p>
      ) : (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(350px, 100%), 1fr))",
          gap: 24,
        }}
      >
        {restaurantsAffiches.map((r) => (
          <a
            key={r.id}
            href={`/${locale}/${r.pays.toLowerCase()}/${r.slug}`}
            className="carte-restaurant"
            style={{
              display: "block",
              textDecoration: "none",
              color: "inherit",
              background: "white",
              border: "1px solid #E5E1D8",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03), 0 6px 20px rgba(0,0,0,0.05)",
              transition: "transform 0.25s ease, box-shadow 0.25s ease",
            }}
          >
            <div
              style={{
                height: 192,
                overflow: "hidden",
                position: "relative",
                background: "#E5E1D8",
              }}
            >
              {r.logo_url ? (
                <img
                  src={r.logo_url}
                  alt={r.nom}
                  className="carte-restaurant-image"
                  style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.35s ease" }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 48,
                    fontWeight: 700,
                    color: "#F59E0B",
                  }}
                >
                  {r.nom.charAt(0)}
                </div>
              )}
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  padding: "4px 10px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  color: tierColors[r.tier],
                  background: tierBg[r.tier],
                }}
              >
                {r.tier.toUpperCase()}
              </div>
              {r.distance != null && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const url = position
                      ? `https://www.google.com/maps/dir/?api=1&origin=${position.lat},${position.lng}&destination=${r.latitude},${r.longitude}`
                      : `https://www.google.com/maps?q=${r.latitude},${r.longitude}`;
                    window.open(url, "_blank", "noopener,noreferrer");
                  }}
                  title={t("voir_sur_maps")}
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 10px",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#854F0B",
                    background: "rgba(255,255,255,0.92)",
                    backdropFilter: "blur(4px)",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <MapPin size={11} />
                  {r.distance < 1
                    ? `${Math.round(r.distance * 1000)} m`
                    : `${r.distance.toFixed(1)} km`}
                </button>
              )}
              <div className="carte-restaurant-overlay" style={{
                position: "absolute", inset: 0, display: "flex", alignItems: "flex-end",
                justifyContent: "center", padding: 14,
                background: "linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0))",
                opacity: 0, transition: "opacity 0.25s ease",
              }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 16px", borderRadius: 20, background: "#F59E0B",
                  color: "white", fontSize: 12.5, fontWeight: 700,
                }}>
                  <UtensilsCrossed size={13} />
                  Voir le menu
                </span>
              </div>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                <h3
                  style={{
                    fontFamily: "Georgia, serif",
                    fontWeight: 700,
                    fontSize: 18,
                    margin: 0,
                  }}
                >
                  {r.nom}
                </h3>
                {r.satisfaction != null && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0,
                    fontSize: 12, fontWeight: 700, color: "#0F8B4C", background: "#EAF7EE",
                    padding: "3px 9px", borderRadius: 20, whiteSpace: "nowrap",
                  }}>
                    <ThumbsUp size={11} />
                    {r.satisfaction}%
                  </span>
                )}
              </div>
              <p
                style={{
                  fontSize: 14,
                  color: "#6B7280",
                  marginBottom: 12,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {r.description}
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: "#6B7280",
                }}
              >
                <span>
                  {r.ville}, {r.quartier}
                </span>
                <span style={{ opacity: 0.4 }}>-</span>
                <span>{r.pays}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
      )}

      <style jsx>{`
        .carte-restaurant:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05), 0 16px 32px rgba(0, 0, 0, 0.1) !important;
        }
        .carte-restaurant:hover .carte-restaurant-image {
          transform: scale(1.06);
        }
        .carte-restaurant:hover .carte-restaurant-overlay {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
