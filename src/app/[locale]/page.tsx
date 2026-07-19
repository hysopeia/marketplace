import { getTranslations } from "next-intl/server";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import AuthNav from "@/components/AuthNav";
import { Search, CalendarCheck, UtensilsCrossed, Clock, Wallet, Smile, QrCode, CreditCard, Gift, BarChart3, Users } from "lucide-react";
import RechercheHero from "@/components/RechercheHero";
import RestaurantsListClient from "./restaurants/RestaurantsListClient";
import Footer from "@/components/Footer";

async function getRestaurants(locale: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/restaurants?locale=${locale}`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.restaurants || [];
}

async function getStatsPlateforme() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/avis?scope=plateforme`, {
    cache: "no-store",
  });
  if (!res.ok) return { pourcentageSatisfaction: null, totalAvisClients: 0 };
  return res.json();
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
  const statsPlateforme = await getStatsPlateforme();
  const navKeys = ["nav_home", "nav_restaurants", "nav_dashboard", "nav_admin", "nav_login"];

  const etapes = [
    { numero: 1, titre: t("etape1_titre"), texte: t("etape1_texte"), Icone: Search },
    { numero: 2, titre: t("etape2_titre"), texte: t("etape2_texte"), Icone: CalendarCheck },
    { numero: 3, titre: t("etape3_titre"), texte: t("etape3_texte"), Icone: UtensilsCrossed },
  ];

  const avantages = [
    { titre: t("avantage_reservations_titre"), texte: t("avantage_reservations_texte"), Icone: UtensilsCrossed, couleur: "#0F8B4C" },
    { titre: t("avantage_qrcode_titre"), texte: t("avantage_qrcode_texte"), Icone: QrCode, couleur: "#D97706" },
    { titre: t("avantage_paiements_titre"), texte: t("avantage_paiements_texte"), Icone: CreditCard, couleur: "#2563EB" },
    { titre: t("avantage_fidelisation_titre"), texte: t("avantage_fidelisation_texte"), Icone: Gift, couleur: "#DC2626" },
    { titre: t("avantage_statistiques_titre"), texte: t("avantage_statistiques_texte"), Icone: BarChart3, couleur: "#9333EA" },
    { titre: t("avantage_equipe_titre"), texte: t("avantage_equipe_texte"), Icone: Users, couleur: "#0891B2" },
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
          height: 64, gap: 12
        }}>
          <a href={`/${locale}`} style={{
            display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0
          }}>
            <img src="/images/logo-afritable.png" alt="AfriTable" style={{ width: 36, height: 36, borderRadius: 10 }} />
            <span style={{ fontWeight: 700, fontSize: 18, color: "#1F2937" }}>AfriTable</span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <AuthNav navKeys={navKeys} locale={locale} activeKey="nav_home" />
            <LanguageSwitcher locale={locale} />
          </div>
        </div>
      </header>

      <main style={{
        paddingTop: 64,
        background: "linear-gradient(135deg, #F59E0B 0%, #123B26 40%, #0B2818 100%)",
        minHeight: "80vh", display: "flex", alignItems: "center"
      }}>
        <div className="hero-grid" style={{
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
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center", marginBottom: 28 }}>
              <a href={`/${locale}/restaurants`} style={{
                padding: "17px 38px", borderRadius: 14, border: "none",
                background: "#0F8B4C", color: "white", fontWeight: 700,
                fontSize: 16, cursor: "pointer", fontFamily: "inherit", textDecoration: "none",
                boxShadow: "0 10px 28px rgba(15,139,76,0.35)",
              }}>
                {t("hero_cta")}
              </a>
            </div>

            <RechercheHero
              locale={locale}
              placeholder={t("hero_recherche_placeholder")}
              bouton={t("hero_recherche_bouton")}
            />
          </div>

          <div style={{ position: "relative" }}>
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              width: 420, height: 420, transform: "translate(-50%, -50%)",
              background: "radial-gradient(circle, rgba(245,158,11,0.35) 0%, rgba(245,158,11,0) 70%)",
              filter: "blur(10px)", pointerEvents: "none",
            }} />
            <div style={{
              position: "relative", borderRadius: 20, overflow: "hidden", height: 380,
              boxShadow: "0 20px 50px rgba(0,0,0,0.35)"
            }}>
              <img
                src="/images/hero-patron.jpg"
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div className="hero-badge-flottant" style={{
              position: "absolute", top: -14, right: -14,
              background: "white", borderRadius: 12, padding: "12px 18px",
              boxShadow: "0 10px 26px rgba(0,0,0,0.18)",
              display: "flex", alignItems: "center", gap: 12
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: "#FAEEDA",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <Clock size={20} color="#854F0B" />
              </div>
              <div>
                <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>{t("stat_partenaires")}</p>
                <p style={{ fontSize: 19, fontWeight: 800, margin: 0, color: "#1A1A2E" }}>{restaurants.length}</p>
              </div>
            </div>
            <div className="hero-badge-flottant" style={{
              position: "absolute", bottom: 30, left: -20,
              background: "white", borderRadius: 12, padding: "12px 18px",
              boxShadow: "0 10px 26px rgba(0,0,0,0.18)",
              display: "flex", alignItems: "center", gap: 12
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: "#EAF3DE",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <Wallet size={20} color="#3B6D11" />
              </div>
              <div>
                <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>{t("stat_commission")}</p>
                <p style={{ fontSize: 19, fontWeight: 800, margin: 0, color: "#1A1A2E" }}>0%</p>
              </div>
            </div>
            <div className="hero-badge-flottant" style={{
              position: "absolute", bottom: -14, right: 20,
              background: "white", borderRadius: 12, padding: "12px 18px",
              boxShadow: "0 10px 26px rgba(0,0,0,0.18)",
              display: "flex", alignItems: "center", gap: 12
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: "#FAECE7",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <Smile size={20} color="#993C1D" />
              </div>
              <div>
                <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>{t("stat_satisfaction")}</p>
                <p style={{ fontSize: 19, fontWeight: 800, margin: 0, color: "#1A1A2E" }}>
                  {statsPlateforme.pourcentageSatisfaction != null
                    ? `${statsPlateforme.pourcentageSatisfaction}%`
                    : t("stat_bientot")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <section style={{ padding: "56px 24px", background: "white" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h2 style={{
            fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 800,
            color: "#1A1A2E", textAlign: "center", marginBottom: 48
          }}>
            {t("comment_ca_marche")}
          </h2>
          <div style={{ position: "relative" }}>
            <div style={{
              position: "absolute", top: 28, left: "16.6%", right: "16.6%",
              height: 2, background: "repeating-linear-gradient(to right, #F0997B 0, #F0997B 8px, transparent 8px, transparent 16px)",
              zIndex: 0
            }} />
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32,
              position: "relative", zIndex: 1
            }}>
              {etapes.map((e) => (
                <div key={e.numero} style={{ textAlign: "center" }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%", background: "#F59E0B",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 16px", boxShadow: "0 4px 12px rgba(245,158,11,0.3)"
                  }}>
                    <e.Icone size={24} color="white" />
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#D85A30", marginBottom: 6, letterSpacing: 0.5 }}>
                    {t("etape")} {e.numero}
                  </p>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1A1A2E", marginBottom: 8 }}>
                    {e.titre}
                  </h3>
                  <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6, maxWidth: 240, margin: "0 auto" }}>
                    {e.texte}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: "64px 24px", background: "#FDF8F0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h2 style={{
            fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 800,
            color: "#1A1A2E", textAlign: "center", marginBottom: 44
          }}>
            {t("pourquoi_titre")}
          </h2>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24,
          }}>
            {avantages.map((a) => (
              <div key={a.titre} style={{
                background: "white", borderRadius: 16, padding: "28px 24px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, background: `${a.couleur}18`,
                  display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18,
                }}>
                  <a.Icone size={22} color={a.couleur} />
                </div>
                <h3 style={{ fontSize: 16.5, fontWeight: 700, color: "#1A1A2E", marginBottom: 8 }}>
                  {a.titre}
                </h3>
                <p style={{ fontSize: 13.5, color: "#6B7280", lineHeight: 1.6 }}>
                  {a.texte}
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
                background: "linear-gradient(to right, #0F8B4C, #F59E0B)", borderRadius: 2
              }} />
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 800, color: "#1A1A2E" }}>
                {t("resto_nearby")}
              </h2>
            </div>
            <RestaurantsListClient restaurants={restaurants.slice(0, 3)} locale={locale} />
          </div>
        </section>
      )}

      <Footer locale={locale} />
    </div>
  );
}
