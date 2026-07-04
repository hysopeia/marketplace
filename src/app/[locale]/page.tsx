import { getTranslations } from "next-intl/server";

async function getRestaurants(locale: string) {
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

export default async function HomePage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = await params;
  const t = await getTranslations();
  const restaurants = await getRestaurants(locale);
  const navKeys = ["nav_home", "nav_restaurants", "nav_pricing", "nav_dashboard", "nav_admin"];

  const tierColors: Record<string, string> = {
    starter: "#3B82F6",
    business: "#D4A017",
    groupe: "#A855F7",
  };

  const tierBg: Record<string, string> = {
    starter: "#EFF6FF",
    business: "#FFFBEB",
    groupe: "#FAF5FF",
  };

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
            display: "flex", alignItems: "center", gap: 10, textDecoration: "none"
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: "#1B4332",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 700, fontSize: 18
            }}>R</div>
            <span style={{ fontWeight: 700, fontSize: 18, color: "#1B4332" }}>ReservDine</span>
          </a>
          <nav style={{ display: "flex", gap: 4 }}>
            {navKeys.map((key) => (
              <a
                key={key}
                href={getNavHref(key, locale)}
                style={{
                  padding: "8px 14px", borderRadius: 10, fontSize: 14,
                  fontWeight: 500, color: key === "nav_home" ? "#1B4332" : "#6B7280",
                  background: key === "nav_home" ? "rgba(27,67,50,0.06)" : "transparent",
                  textDecoration: "none"
                }}
              >
                {t(key)}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main style={{
        paddingTop: 64,
        background: "linear-gradient(135deg, #1B4332 0%, #0D2818 40%, #1a3a2a 100%)",
        minHeight: "85vh", display: "flex", alignItems: "center"
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", width: "100%" }}>
          <div style={{ maxWidth: 600 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "6px 16px", borderRadius: 20, fontSize: 13,
              fontWeight: 500, marginBottom: 24,
              background: "rgba(212,160,23,0.15)", color: "#FCD34D"
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#FBBF24" }} />
              Phase 0 — Fondations globales
            </div>
            <h1 style={{
              fontFamily: "Georgia, serif", fontSize: 48, fontWeight: 900,
              color: "white", lineHeight: 1.15, marginBottom: 20
            }}>
              {t("hero_title")}
            </h1>
            <p style={{
              fontSize: 18, color: "rgba(255,255,255,0.7)",
              lineHeight: 1.6, marginBottom: 36, maxWidth: 520
            }}>
              {t("hero_sub")}
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href={`/${locale}/restaurants`} style={{
                padding: "14px 32px", borderRadius: 12, border: "none",
                background: "#D4A017", color: "#1A1A2E", fontWeight: 600,
                fontSize: 15, cursor: "pointer", fontFamily: "inherit", textDecoration: "none"
              }}>
                {t("hero_cta")}
              </a>
              <a href={`/${locale}/pricing`} style={{
                padding: "14px 32px", borderRadius: 12,
                border: "2px solid rgba(255,255,255,0.3)",
                background: "transparent", color: "white", fontWeight: 600,
                fontSize: 15, cursor: "pointer", fontFamily: "inherit", textDecoration: "none"
              }}>
                {t("hero_cta2")}
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Restaurants sur la page d'accueil */}
      {restaurants.length > 0 && (
        <section style={{ padding: "48px 24px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ marginBottom: 32 }}>
              <div style={{
                width: 56, height: 3, marginBottom: 16,
                background: "linear-gradient(to right, #D4A017, #C75B39)", borderRadius: 2
              }} />
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 800, color: "#1A1A2E" }}>
                {t("resto_nearby")}
              </h2>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 20
            }}>
              {restaurants.slice(0, 3).map((r: any) => (
                <a
                  key={r.id}
                  href={`/${locale}/${r.pays.toLowerCase()}/${r.slug}`}
                  style={{
                    display: "block", textDecoration: "none", color: "inherit",
                    background: "white", border: "1px solid #E5E1D8",
                    borderRadius: 16, overflow: "hidden",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                    transition: "transform 0.3s, box-shadow 0.3s"
                  }}
                >
                  <div style={{
                    height: 160, overflow: "hidden", position: "relative",
                    background: "#E5E1D8", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: 40, fontWeight: 700, color: "#1B4332"
                  }}>
                    {r.nom.charAt(0)}
                    <div style={{
                      position: "absolute", top: 10, left: 10,
                      padding: "3px 8px", borderRadius: 6, fontSize: 10,
                      fontWeight: 700, color: tierColors[r.tier],
                      background: tierBg[r.tier]
                    }}>{r.tier.toUpperCase()}</div>
                  </div>
                  <div style={{ padding: 16 }}>
                    <h3 style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                      {r.nom}
                    </h3>
                    <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {r.description}
                    </p>
                    <span style={{ fontSize: 12, color: "#6B7280" }}>
                      {r.ville}, {r.quartier} — {r.pays}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}