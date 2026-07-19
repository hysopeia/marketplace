import { getTranslations } from "next-intl/server";
import AuthNav from "@/components/AuthNav";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";
import { MapPin, UtensilsCrossed, ThumbsUp } from "lucide-react";

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
  logo_url: string | null;
  couleur_primaire: string | null;
  couleur_secondaire: string | null;
  satisfaction: number | null;
  menu: Categorie[];
};

const COULEURS_CATEGORIES = ["#F59E0B", "#0F8B4C", "#DC2626", "#9333EA", "#2563EB", "#D97706"];

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

  // Recupere le menu complet + la satisfaction reelle (avis clients
  // visibles) de chaque restaurant (nombre de restaurants reste faible
  // pour l'instant, acceptable en N+1 requetes).
  const restaurantsAvecMenus = await Promise.all(
    restaurants.map(async (r: any) => {
      const res = await fetch(`${baseUrl}/api/restaurants?slug=${r.slug}&locale=${locale}`, {
        cache: "no-store",
      });
      const data = res.ok ? await res.json() : { menu: [] };

      const { data: avis } = await supabase
        .from("avis")
        .select("positif")
        .eq("restaurant_id", r.id)
        .eq("auteur_type", "client")
        .eq("visible", true);

      const totalAvis = avis?.length || 0;
      const positifs = avis?.filter((a: { positif: boolean }) => a.positif).length || 0;
      const satisfaction = totalAvis >= 3 ? Math.round((positifs / totalAvis) * 100) : null;

      return { ...r, menu: data.menu || [], satisfaction };
    })
  );

  return restaurantsAvecMenus;
}

export default async function PricingPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = await params;
  const t = await getTranslations();
  const restaurants = await getRestaurantsAvecMenus(locale);
  const navKeys = ["nav_home", "nav_restaurants", "nav_dashboard", "nav_admin", "nav_login"];

  return (
    <div style={{ minHeight: "100vh", background: "#FFF8F2" }}>
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
          position: "relative", overflow: "hidden",
          background: "linear-gradient(135deg, #F59E0B 0%, #1F2937 100%)",
          padding: "60px 24px",
        }}>
          <div style={{
            position: "absolute", top: -80, right: -60, width: 320, height: 320, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%)",
          }} />
          <div style={{ position: "relative", maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
            <div style={{
              width: 56, height: 3, margin: "0 auto 16px",
              background: "linear-gradient(to right, #0F8B4C, #FBF3E7)", borderRadius: 2
            }} />
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: 36, fontWeight: 800, marginBottom: 12, color: "white" }}>
              Decouvrez les saveurs de nos restaurants partenaires
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
            restaurants.map((r) => {
              const couleurPrimaire = r.couleur_primaire || "#F59E0B";
              const couleurSecondaire = r.couleur_secondaire || "#1F2937";
              return (
                <div key={r.id} style={{
                  background: "white", borderRadius: 18, marginBottom: 28, overflow: "hidden",
                  boxShadow: "0 6px 24px rgba(31,41,55,0.10)",
                }}>
                  {/* Bandeau aux couleurs propres du restaurant (personnalisation reelle) */}
                  <div style={{
                    position: "relative", height: 96,
                    background: `linear-gradient(120deg, ${couleurPrimaire} 0%, ${couleurSecondaire} 100%)`,
                  }}>
                    {r.logo_url && (
                      <img
                        src={r.logo_url}
                        alt=""
                        style={{
                          position: "absolute", left: 24, bottom: -28,
                          width: 68, height: 68, borderRadius: 16, objectFit: "cover",
                          border: "3px solid white", boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
                        }}
                      />
                    )}
                  </div>

                  <div style={{ padding: "24px", paddingTop: r.logo_url ? 40 : 24 }}>
                    <div style={{ marginBottom: 16 }}>
                      <h2 style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700, color: "#1A1A2E", marginBottom: 6 }}>
                        {r.nom}
                      </h2>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", alignItems: "center" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "#6B7280" }}>
                          <MapPin size={13} color="#9CA3AF" />
                          {r.ville}{r.quartier ? `, ${r.quartier}` : ""} — {r.pays}
                        </span>
                        {r.satisfaction != null && (
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700,
                            color: "#0F8B4C", background: "#EAF7EE", padding: "3px 10px", borderRadius: 20,
                          }}>
                            <ThumbsUp size={12} />
                            {r.satisfaction}% satisfaits
                          </span>
                        )}
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 600,
                          color: "#854F0B", background: "#FEF3C7", padding: "3px 10px", borderRadius: 20,
                        }}>
                          Commande en ligne disponible
                        </span>
                      </div>
                    </div>

                    {r.menu.length === 0 ? (
                      <p style={{ fontSize: 13, color: "#9CA3AF" }}>{t("tarifs_menu_vide")}</p>
                    ) : (
                      r.menu.map((cat, catIndex) => {
                        const couleurCat = COULEURS_CATEGORIES[catIndex % COULEURS_CATEGORIES.length];
                        return (
                          <div key={cat.id} style={{ marginBottom: 18 }}>
                            <span style={{
                              display: "inline-block", fontSize: 11.5, fontWeight: 700, color: "white",
                              background: couleurCat, textTransform: "uppercase", letterSpacing: 0.5,
                              padding: "4px 12px", borderRadius: 20, marginBottom: 10,
                            }}>
                              {cat.nom}
                            </span>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {cat.items.map((item) => (
                                <div key={item.id} style={{
                                  display: "flex", alignItems: "center", gap: 12,
                                  padding: "10px 12px", borderRadius: 12, background: "#FFF8F2",
                                  boxShadow: "0 1px 2px rgba(31,41,55,0.04)",
                                }}>
                                  {item.photo_url ? (
                                    <img
                                      src={item.photo_url}
                                      alt=""
                                      style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
                                    />
                                  ) : (
                                    <div style={{
                                      width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                                      background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>
                                      <UtensilsCrossed size={18} color="#D97706" />
                                    </div>
                                  )}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 14, fontWeight: 600, color: "#1F2937", margin: 0 }}>{item.nom}</p>
                                    {item.description && (
                                      <p style={{ fontSize: 12, color: "#9CA3AF", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {item.description}
                                      </p>
                                    )}
                                  </div>
                                  <span style={{
                                    fontSize: 13, fontWeight: 700, color: "white", background: "#F59E0B",
                                    padding: "5px 12px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0,
                                  }}>
                                    {formatPrice(item.prix, r.devise)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })
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
                </div>
              );
            })
          )}
        </div>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
