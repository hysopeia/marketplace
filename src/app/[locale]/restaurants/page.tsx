import { getTranslations } from "next-intl/server";
import RestaurantsListClient from "./RestaurantsListClient";
import BanniereCarousel from "./BanniereCarousel";

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
};

async function getRestaurants(locale: string): Promise<Restaurant[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/restaurants?locale=${locale}`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.restaurants || [];
}

function getNavHref(key: string, locale: string): string {
  if (key === "nav_home") return `/${locale}`;
  if (key === "nav_restaurants") return `/${locale}/restaurants`;
  if (key === "nav_pricing") return `/${locale}/pricing`;
  if (key === "nav_dashboard") return `/${locale}/dashboard`;
  if (key === "nav_admin") return `/${locale}/admin`;
  return `/${locale}`;
}

export default async function RestaurantsPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = await params;
  const t = await getTranslations();
  const restaurants = await getRestaurants(locale);

  const navKeys = ["nav_home", "nav_restaurants", "nav_pricing", "nav_dashboard", "nav_admin"];

  return (
    <div style={{ minHeight: "100vh", background: "#FDF8F0" }}>
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
            display: "flex", alignItems: "center", gap: 10,
            textDecoration: "none"
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "#C75B39", display: "flex",
              alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 700, fontSize: 18
            }}>R</div>
            <span style={{ fontWeight: 700, fontSize: 18, color: "#C75B39" }}>
              ReservDine
            </span>
          </a>
          <nav style={{ display: "flex", gap: 4 }}>
            {navKeys.map((key) => (
              <a
                key={key}
                href={getNavHref(key, locale)}
                style={{
                  padding: "8px 14px", borderRadius: 10, fontSize: 14,
                  fontWeight: 500, color: key === "nav_restaurants" ? "#C75B39" : "#6B7280",
                  background: key === "nav_restaurants" ? "rgba(199,91,57,0.06)" : "transparent",
                  textDecoration: "none"
                }}
              >
                {t(key)}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ paddingTop: 64 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 24px 0" }}>
          <BanniereCarousel />
        </div>

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 48px" }}>
          <div style={{ marginBottom: 40 }}>
            <div style={{
              width: 56, height: 3, marginBottom: 16,
              background: "linear-gradient(to right, #E8A93B, #C75B39)",
              borderRadius: 2
            }} />
            <h1 style={{
              fontFamily: "Georgia, serif", fontSize: 36, fontWeight: 800,
              color: "#1A1A2E", marginBottom: 8
            }}>
              {t("resto_nearby")}
            </h1>
          </div>

          <RestaurantsListClient restaurants={restaurants} locale={locale} />
        </div>
      </main>
    </div>
  );
}
