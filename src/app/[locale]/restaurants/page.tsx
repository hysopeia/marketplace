import { getTranslations } from "next-intl/server";
import RestaurantsListClient from "./RestaurantsListClient";
import BanniereCarousel from "./BanniereCarousel";
import AuthNav from "@/components/AuthNav";
import Footer from "@/components/Footer";

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

  const navKeys = ["nav_home", "nav_restaurants", "nav_pricing", "nav_dashboard", "nav_admin", "nav_login"];

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
          height: 64, gap: 12
        }}>
          <a href={`/${locale}`} style={{
            display: "flex", alignItems: "center", gap: 10,
            textDecoration: "none", flexShrink: 0
          }}>
            <img src="/images/logo-afritable.png" alt="AfriTable" style={{ width: 36, height: 36, borderRadius: 10 }} />
            <span style={{ fontWeight: 700, fontSize: 18, color: "#1F2937" }}>
              AfriTable
            </span>
          </a>
          <AuthNav navKeys={navKeys} locale={locale} activeKey="nav_restaurants" />
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
              background: "linear-gradient(to right, #0F8B4C, #F59E0B)",
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

      <Footer locale={locale} />
    </div>
  );
}
