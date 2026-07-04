import { getTranslations } from "next-intl/server";
import LanguageSwitcher from "@/components/LanguageSwitcher";

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
  if (key === "nav_login") return `/${locale}/login`;
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
  const navKeys = ["nav_home", "nav_restaurants", "nav_pricing", "nav_dashboard", "nav_admin", "nav_login"];

  const tierColors: Record<string, string> = {
    starter: "#378ADD",
    business: "#E8A93B",
    groupe: "#A855F7",
  };

  const tierBg: Record<string, string> = {
    starter: "#EFF6FF",
    business: "#FFFBEB",
    groupe: "#FAF5FF",
  };

  const etapes = [
    { numero: 1, titre: t("etape1_titre"), texte: t("etape1_texte"), icone: "🔍" },
    { numero: 2, titre: t("etape2_titre"), texte: t("etape2_texte"), icone: "📅" },
    { numero: 3, titre: t("etape3_titre"), texte: t("etape3_texte"), icone: "🍽" },
  ];

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
              width: 36, height: 36, borderRadius: 10, background: "#C75B39",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 700, fontSize: 18
            }}>R</div>
            <span style={{ fontWeight: 700, fontSize: 18, color: "#C75B39" }}>ReservDine</span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <nav style={{ display: "flex", gap: 4 }}>
              {navKeys.map((key) => (
                <a
                  key={key}
                  href={getNavHref(key, locale)}
                  style={{
                    padding: "8px 14px", borderRadius: 10, fontSize: 14,
                    fontWeight: 500, color: key === "nav_home" ? "#C75B39" : "#6B7280",
                    background: key === "nav_home" ? "rgba(199,91,57,0.08)" : "transparent",
                    textDecoration: "none"
                  }}
                >
                  {t(key)}
                </a>
              ))}
            </nav>
            <LanguageSwitcher locale={locale} />
          </div>
        </div>
      </header>

      <main style={{
        paddingTop: 64,
        background: "linear-gradient(135deg, #C75B39 0%, #26221C 40%, #3A2E22 100%)",
        minHeight: "80vh", display: "flex", alignItems: "center"
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto", padding: "48px 24px", width: "100%",
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center"
        }}>
          <div>
            <h1 style={{
              fontFamily: "Georgia, serif", fontSize: 44, fontWeight: 900,
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
                background: "#E8A93B", color: "#412402", fontWeight: 600,
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

          <div style={{ position: "relative" }}>
            <div style={{
              borderRadius: 20, overflow: "hidden", height: 380,
              boxShadow: "0 20px 50px rgba(0,0,0,0.35)"
            }}>
              <img
                src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80"
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div style={{
              position: "absolute", top: -14, right: -14,
              background: "white", borderRadius: 12, padding: "10px 16px",
              boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
              display: "flex", alignItems: "center", gap: 8
            }}>
              <span style={{ fontSize: 20 }}>⏱</span>
              <div>
                <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>{t("stat_temps")}</p>
                <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "#1A1A2E" }}>-70%</p>
              </div>
            </div>
            <div style={{
              position: "absolute", bottom: 30, left: -20,
              background: "white", borderRadius: 12, padding: "10px 16px",
              boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
              display: "flex", alignItems: "center", gap: 8
            }}>
              <span style={{ fontSize: 20 }}>💰</span>
              <div>
                <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>{t("stat_commission")}</p>
                <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "#1A1A2E" }}>0%</p>
              </div>
            </div>
            <div style={{
              position: "absolute", bottom: -14, right: 20,
              background: "white", borderRadius: 12, padding: "10px 16px",
              boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
              display: "flex", alignItems: "center", gap: 8
            }}>
              <span style={{ fontSize: 20 }}>😊</span>
              <div>
                <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>{t("stat_satisfaction")}</p>
                <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "#1A1A2E" }}>98%</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <section style={{ padding: "56px 24px", background: "white" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h2 style={{
            fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 800,
            color: "#1A1A2E", textAlign: "center", marginBottom: 40
          }}>
            {t("comment_ca_marche")}
          </h2>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32
          }}>
            {etapes.map((e) => (
              <div key={e.numero} style={{ textAlign: "center" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%", background: "#FAECE7",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 24, margin: "0 auto 16px"
                }}>{e.icone}</div>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#D85A30", marginBottom: 6 }}>
                  {t("etape")} {e.numero}
                </p>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1A1A2E", marginBottom: 8 }}>
                  {e.titre}
                </h3>
                <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>
                  {e.texte}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {restaurants.length > 0 && (
        <section style={{ padding: "48px 24px", background: "#FDF8F0" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div style={{ marginBottom: 32 }}>
              <div style={{
                width: 56, height: 3, marginBottom: 16,
                background: "linear-gradient(to right, #E8A93B, #C75B39)", borderRadius: 2
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
                    fontSize: 40, fontWeight: 700, color: "#C75B39"
                  }}>
                    {r.nom.charAt(0)}
                    <div style={{
                      position: "absolute", top: 10, left: 10,
                      padding: "3px 8px", borderRadius: 6, fontSize: 10,
                      fontWeight: 700, color: tierColors[r.tier],
                      background: tierBg[r.tier]
                    }}>{r.tier.toUpperCase()}</div>
                    <div style={{
                      position: "absolute", top: 10, right: 10,
                      padding: "3px 9px", borderRadius: 6, fontSize: 11,
                      fontWeight: 700, color: "#712B13", background: "white",
                      display: "flex", alignItems: "center", gap: 4
                    }}>
                      {r.note_moyenne ? (
                        <>⭐ {r.note_moyenne}</>
                      ) : (
                        t("nouveau")
                      )}
                    </div>
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
