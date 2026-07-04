import { getTranslations } from "next-intl/server";

function getNavHref(key: string, locale: string): string {
  if (key === "nav_home") return `/${locale}`;
  if (key === "nav_restaurants") return `/${locale}/restaurants`;
  if (key === "nav_pricing") return `/${locale}/pricing`;
  if (key === "nav_dashboard") return `/${locale}/dashboard`;
  if (key === "nav_admin") return `/${locale}/admin`;
  return `/${locale}`;
}

export default async function PricingPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = await params;
  const t = await getTranslations();
  const navKeys = ["nav_home", "nav_restaurants", "nav_pricing", "nav_dashboard"];

  const tiers = [
    {
      key: "starter",
      features: ["pricing_f1", "pricing_f2", "pricing_f3", "pricing_f4"],
      featured: false,
    },
    {
      key: "business",
      features: [
        "pricing_f1", "pricing_f2", "pricing_f3", "pricing_f4",
        "pricing_f5", "pricing_f6", "pricing_f7", "pricing_f8", "pricing_f9",
      ],
      featured: true,
    },
    {
      key: "groupe",
      features: [
        "pricing_f1", "pricing_f2", "pricing_f3", "pricing_f4",
        "pricing_f5", "pricing_f6", "pricing_f7", "pricing_f8", "pricing_f9",
        "pricing_f10", "pricing_f11", "pricing_f12", "pricing_f13", "pricing_f14",
      ],
      featured: false,
    },
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
          <nav style={{ display: "flex", gap: 4 }}>
            {navKeys.map((key) => (
              <a key={key} href={getNavHref(key, locale)} style={{
                padding: "8px 14px", borderRadius: 10, fontSize: 14, fontWeight: 500,
                color: key === "nav_pricing" ? "#C75B39" : "#6B7280",
                background: key === "nav_pricing" ? "rgba(27,67,50,0.06)" : "transparent",
                textDecoration: "none"
              }}>{t(key)}</a>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ paddingTop: 64, padding: "48px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{
              width: 56, height: 3, marginBottom: 16, margin: "0 auto 16px",
              background: "linear-gradient(to right, #E8A93B, #C75B39)", borderRadius: 2
            }} />
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: 36, fontWeight: 800, marginBottom: 12, color: "#1A1A2E" }}>
              {t("pricing_title")}
            </h1>
            <p style={{ fontSize: 18, color: "#6B7280", maxWidth: 520, margin: "0 auto" }}>
              {t("pricing_sub")}
            </p>
          </div>

          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24
          }}>
            {tiers.map((tier) => (
              <div key={tier.key} style={{
                border: tier.featured ? "2px solid #E8A93B" : "2px solid #E5E1D8",
                borderRadius: 20, padding: 32, background: "white",
                position: "relative",
                boxShadow: tier.featured ? "0 0 0 1px #E8A93B, 0 12px 40px rgba(212,160,23,0.15)" : "none"
              }}>
                {tier.featured && (
                  <div style={{
                    position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                    padding: "4px 16px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                    background: "#E8A93B", color: "#1A1A2E"
                  }}>{t("pricing_popular")}</div>
                )}
                <h3 style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 20, marginBottom: 8 }}>
                  {t(`pricing_${tier.key}`)}
                </h3>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 24 }}>
                  <span style={{ fontFamily: "Georgia, serif", fontSize: 40, fontWeight: 900 }}>
                    {t(`pricing_${tier.key}_price`)}
                  </span>
                  <span style={{ fontSize: 14, color: "#6B7280" }}>{t("pricing_month")}</span>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px", display: "flex", flexDirection: "column", gap: 12 }}>
                  {tier.features.map((f) => (
                    <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14 }}>
                      <span style={{ color: "#C75B39", marginTop: 2 }}>✓</span>
                      <span>{t(f)}</span>
                    </li>
                  ))}
                </ul>
                <button style={{
                  width: "100%", padding: "14px 0", borderRadius: 12,
                  background: tier.featured ? "#E8A93B" : "transparent",
                  color: tier.featured ? "#1A1A2E" : "#C75B39",
                  fontWeight: 600, fontSize: 15, cursor: "pointer", fontFamily: "inherit",
                  border: tier.featured ? "none" : "2px solid #C75B39"
                }}>{t("pricing_cta")}</button>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 48, padding: 24, background: "white", borderRadius: 16, border: "1px solid #E5E1D8" }}>
            <p style={{ fontSize: 15, color: "#6B7280", maxWidth: 600, margin: "0 auto" }}>
              {t("pricing_commission_note")}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}