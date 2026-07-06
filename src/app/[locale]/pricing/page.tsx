import { getTranslations } from "next-intl/server";
import AuthNav from "@/components/AuthNav";
import { createClient } from "@/lib/supabase/server";

type MenuItem = {
  id: string;
  nom: string;
  description: string;
  prix: number;
  photo_url: string;
};

type Categorie = {
  id: string;
  nom: string;
  items: MenuItem[];
};

type RestaurantAvecMenu = {
  id: string;
  nom: string;
  slug: string;
  pays: string;
  ville: string;
  quartier: string;
  devise: string;
  menu: Categorie[];
};

function formatPrice(amount: number, devise: string): string {
  return (
    new Intl.NumberFormat("fr-FR", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) +
    " " +
    devise
  );
}

async function getRestaurantsAvecMenus(locale: string): Promise<RestaurantAvecMenu[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const resListe = await fetch(`${baseUrl}/api/restaurants?locale=${locale}`, {
    cache: "no-store",
  });
  if (!resListe.ok) return [];
  const dataListe = await resListe.json();
  let restaurants = dataListe.restaurants || [];

  // Si un compte restaurant est connecte (owner/manager/staff/cuisine),
  // on ne montre QUE son propre restaurant — pas ceux des concurrents.
  // Un visiteur anonyme, lui, voit bien tous les restaurants (page de
  // decouverte publique).
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: acces } = await supabase
      .from("utilisateurs_restaurant")
      .select("restaurant_id")
      .eq("user_id", user.id);

    const mesRestaurantIds = (acces || []).map((a) => a.restaurant_id);
    if (mesRestaurantIds.length > 0) {
      restaurants = restaurants.filter((r: any) => mesRestaurantIds.includes(r.id));
    }
  }

  // Recupere le menu complet de chaque restaurant (nombre de restaurants
  // reste faible pour l'instant, acceptable en N+1 requetes).
  const restaurantsAvecMenus = await Promise.all(
    restaurants.map(async (r: any) => {
      const res = await fetch(`${baseUrl}/api/restaurants?slug=${r.slug}&locale=${locale}`, {
        cache: "no-store",
      });
      if (!res.ok) return { ...r, menu: [] };
      const data = await res.json();
      return { ...r, menu: data.menu || [] };
    })
  );

  return restaurantsAvecMenus;
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

export default async function PricingPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = await params;
  const t = await getTranslations();
  const restaurants = await getRestaurantsAvecMenus(locale);
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
          <a href={`/${locale}`} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
            <img src="/images/logo-afritable.png" alt="AfriTable" style={{ width: 36, height: 36, borderRadius: 10 }} />
            <span style={{ fontWeight: 700, fontSize: 18, color: "#1F2937" }}>AfriTable</span>
          </a>
          <AuthNav navKeys={navKeys} locale={locale} activeKey="nav_pricing" />
        </div>
      </header>

      <main style={{ paddingTop: 64 }}>
        <div style={{
          background: "linear-gradient(135deg, #F59E0B 0%, #1F2937 100%)",
          padding: "56px 24px",
        }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
            <div style={{
              width: 56, height: 3, margin: "0 auto 16px",
              background: "linear-gradient(to right, #0F8B4C, #FBF3E7)", borderRadius: 2
            }} />
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: 36, fontWeight: 800, marginBottom: 12, color: "white" }}>
              {t("tarifs_menus_titre")}
            </h1>
            <p style={{ fontSize: 18, color: "rgba(255,255,255,0.75)", maxWidth: 560, margin: "0 auto" }}>
              {t("tarifs_menus_sous_titre")}
            </p>
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
          {restaurants.length === 0 ? (
            <p style={{ textAlign: "center", color: "#6B7280" }}>{t("tarifs_aucun_restaurant")}</p>
          ) : (
            restaurants.map((r) => (
              <div key={r.id} style={{
                background: "white", borderRadius: 16, padding: 24, marginBottom: 24,
                boxShadow: "0 4px 16px rgba(31,41,55,0.08)",
              }}>
                <div style={{ marginBottom: 16 }}>
                  <h2 style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700, color: "#1A1A2E", marginBottom: 4 }}>
                    {r.nom}
                  </h2>
                  <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>
                    {r.ville}, {r.quartier} — {r.pays}
                  </p>
                </div>

                {r.menu.length === 0 ? (
                  <p style={{ fontSize: 13, color: "#9CA3AF" }}>{t("tarifs_menu_vide")}</p>
                ) : (
                  r.menu.map((cat) => (
                    <div key={cat.id} style={{ marginBottom: 16 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#854F0B", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                        {cat.nom}
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {cat.items.map((item) => (
                          <div key={item.id} style={{
                            display: "flex", justifyContent: "space-between", alignItems: "baseline",
                            padding: "8px 12px", borderRadius: 8, background: "#FDF8F0",
                          }}>
                            <span style={{ fontSize: 14 }}>{item.nom}</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#F59E0B", whiteSpace: "nowrap" }}>
                              {formatPrice(item.prix, r.devise)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}

                <a
                  href={`/${locale}/${r.pays.toLowerCase()}/${r.slug}`}
                  style={{
                    display: "inline-block", marginTop: 8, fontSize: 13, fontWeight: 600,
                    color: "#F59E0B", textDecoration: "none",
                  }}
                >
                  {t("tarifs_voir_restaurant")} →
                </a>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
