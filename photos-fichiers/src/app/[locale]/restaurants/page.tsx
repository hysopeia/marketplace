import { getTranslations } from "next-intl/server";

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

  const tierColors: Record<string, string> = {
    starter: "#3B82F6",
    business: "#E8A93B",
    groupe: "#A855F7",
  };

  const tierBg: Record<string, string> = {
    starter: "#EFF6FF",
    business: "#FFFBEB",
    groupe: "#FAF5FF",
  };

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
        <div style={{
          height: 200, overflow: "hidden", position: "relative"
        }}>
          <img
            src="/images/salle-restaurant.jpg"
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to bottom, rgba(38,34,28,0.1), rgba(38,34,28,0.55))"
          }} />
        </div>

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px" }}>
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

          {restaurants.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "80px 20px",
              color: "#6B7280"
            }}>
              <p style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>
                {t("dash_no_ord")}
              </p>
              <p style={{ fontSize: 14 }}>
                Assurez-vous que le SQL a ete execute et que .env.local contient vos cles Supabase.
              </p>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
              gap: 24
            }}>
              {restaurants.map((r) => (
                <a
                  key={r.id}
                  href={`/${locale}/${r.pays.toLowerCase()}/${r.slug}`}
                  style={{
                    display: "block", textDecoration: "none", color: "inherit",
                    background: "white", border: "1px solid #E5E1D8",
                    borderRadius: 16, overflow: "hidden",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.03), 0 6px 20px rgba(0,0,0,0.05)",
                    transition: "transform 0.3s, box-shadow 0.3s"
                  }}
                >
                  <div style={{
                    height: 192, overflow: "hidden", position: "relative",
                    background: "#E5E1D8"
                  }}>
                    {r.logo_url ? (
                      <img
                        src={r.logo_url}
                        alt={r.nom}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{
                        width: "100%", height: "100%", display: "flex",
                        alignItems: "center", justifyContent: "center",
                        fontSize: 48, fontWeight: 700, color: "#C75B39"
                      }}>
                        {r.nom.charAt(0)}
                      </div>
                    )}
                    <div style={{
                      position: "absolute", top: 12, left: 12,
                      padding: "4px 10px", borderRadius: 8, fontSize: 11,
                      fontWeight: 700, color: tierColors[r.tier],
                      background: tierBg[r.tier]
                    }}>
                      {r.tier.toUpperCase()}
                    </div>
                    <div style={{
                      position: "absolute", top: 12, right: 12,
                      padding: "4px 10px", borderRadius: 8, fontSize: 11,
                      fontWeight: 600, color: "#374151",
                      background: "rgba(255,255,255,0.9)", backdropFilter: "blur(4px)"
                    }}>
                      {r.devise}
                    </div>
                  </div>
                  <div style={{ padding: 20 }}>
                    <h3 style={{
                      fontFamily: "Georgia, serif", fontWeight: 700,
                      fontSize: 18, marginBottom: 6
                    }}>
                      {r.nom}
                    </h3>
                    <p style={{
                      fontSize: 14, color: "#6B7280", marginBottom: 12,
                      display: "-webkit-box", WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical", overflow: "hidden"
                    }}>
                      {r.description}
                    </p>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      fontSize: 13, color: "#6B7280"
                    }}>
                      <span>{r.ville}, {r.quartier}</span>
                      <span style={{ opacity: 0.4 }}>-</span>
                      <span>{r.pays}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}