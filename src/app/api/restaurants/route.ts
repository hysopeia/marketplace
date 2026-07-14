import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function estAutorisePourApercu(
  supabase: ReturnType<typeof createClient>,
  restaurantId: string
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: superAdmin } = await supabase
    .from("super_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (superAdmin) return true;

  const { data: acces } = await supabase
    .from("utilisateurs_restaurant")
    .select("role")
    .eq("user_id", user.id)
    .eq("restaurant_id", restaurantId)
    .in("role", ["owner", "manager"])
    .maybeSingle();

  return !!acces;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") || "fr";
  const slug = searchParams.get("slug");
  const apercu = searchParams.get("apercu") === "1";

  const supabase = createClient();

  // Cas 1 : restaurant individuel par slug
  if (slug) {
    // Recherche sans filtre de statut d'abord, pour pouvoir verifier
    // l'acces au mode apercu meme si le restaurant n'est pas encore actif.
    const { data: restaurantBrut } = await supabase
      .from("restaurants")
      .select("*")
      .eq("slug", slug)
      .single();

    if (!restaurantBrut) {
      return NextResponse.json({ error: "Restaurant non trouve" }, { status: 404 });
    }

    const estActif = restaurantBrut.statut_abonnement === "actif";
    const autorise = apercu && (await estAutorisePourApercu(supabase, restaurantBrut.id));

    // Un visiteur normal ne voit que les restaurants actifs. Le mode
    // apercu ne contourne cette regle que pour le owner/manager du
    // restaurant concerne ou le super_admin — jamais pour un visiteur
    // anonyme, meme avec le parametre apercu dans l'URL.
    if (!estActif && !autorise) {
      return NextResponse.json({ error: "Restaurant non trouve" }, { status: 404 });
    }

    const restaurant = restaurantBrut;

    // Récupérer les traductions du restaurant
    const { data: trads } = await supabase
      .from("traductions")
      .select("champ, valeur")
      .eq("entite_type", "restaurant")
      .eq("entite_id", restaurant.id)
      .eq("langue", locale);

    const nom = trads?.find((t) => t.champ === "nom")?.valeur || restaurant.nom;
    const description = trads?.find((t) => t.champ === "description")?.valeur || "";

    // Récupérer les catégories avec leurs traductions
    const { data: categories } = await supabase
      .from("categories_menu")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("ordre");

    const categorieIds = categories?.map((c) => c.id) || [];

    // Récupérer les traductions de toutes les catégories d'un coup
    let categorieTrads: Record<string, { nom: string }> = {};
    if (categorieIds.length > 0) {
      const { data: catTrads } = await supabase
        .from("traductions")
        .select("entite_id, champ, valeur")
        .eq("entite_type", "categorie")
        .eq("langue", locale)
        .in("entite_id", categorieIds);

      if (catTrads) {
        for (const ct of catTrads) {
          if (!categorieTrads[ct.entite_id]) categorieTrads[ct.entite_id] = { nom: "" };
          if (ct.champ === "nom") categorieTrads[ct.entite_id].nom = ct.valeur;
        }
      }
    }

    // Récupérer les items du menu
    const { data: menuItems } = await supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("disponible", true)
      .order("created_at");

    // Récupérer les traductions de tous les items d'un coup
    const menuItemIds = menuItems?.map((m) => m.id) || [];
    let menuItemTrads: Record<string, { nom: string; description: string }> = {};
    if (menuItemIds.length > 0) {
      const { data: miTrads } = await supabase
        .from("traductions")
        .select("entite_id, champ, valeur")
        .eq("entite_type", "menu_item")
        .eq("langue", locale)
        .in("entite_id", menuItemIds);

      if (miTrads) {
        for (const mt of miTrads) {
          if (!menuItemTrads[mt.entite_id]) menuItemTrads[mt.entite_id] = { nom: "", description: "" };
          if (mt.champ === "nom") menuItemTrads[mt.entite_id].nom = mt.valeur;
          if (mt.champ === "description") menuItemTrads[mt.entite_id].description = mt.valeur;
        }
      }
    }

    // Assembler le menu par catégorie
    const menu = (categories || []).map((cat) => ({
      id: cat.id,
      nom: categorieTrads[cat.id]?.nom || "Sans nom",
      items: (menuItems || [])
        .filter((mi) => mi.categorie_id === cat.id)
        .map((mi) => ({
          id: mi.id,
          prix: mi.prix,
          photo_url: mi.photo_url,
          nom: menuItemTrads[mi.id]?.nom || "Plat",
          description: menuItemTrads[mi.id]?.description || "",
        })),
    }));

    // Récupérer les créneaux de capacité
    const { data: creneaux } = await supabase
      .from("creneaux_capacite")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("jour_semaine")
      .order("heure_debut");

    return NextResponse.json({
      restaurant: { ...restaurant, nom, description },
      menu,
      creneaux: creneaux || [],
    });
  }

  // Cas 2 : liste de tous les restaurants
  const { data: restaurants, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("statut_abonnement", "actif")
    .order("created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Récupérer les traductions de tous les restaurants d'un coup
  const restaurantIds = restaurants?.map((r) => r.id) || [];
  let allTrads: Record<string, { nom: string; description: string }> = {};

  if (restaurantIds.length > 0) {
    const { data: trads } = await supabase
      .from("traductions")
      .select("entite_id, champ, valeur")
      .eq("entite_type", "restaurant")
      .eq("langue", locale)
      .in("entite_id", restaurantIds);

    if (trads) {
      for (const t of trads) {
        if (!allTrads[t.entite_id]) allTrads[t.entite_id] = { nom: "", description: "" };
        if (t.champ === "nom") allTrads[t.entite_id].nom = t.valeur;
        if (t.champ === "description") allTrads[t.entite_id].description = t.valeur;
      }
    }
  }

  const result = (restaurants || []).map((r) => ({
    ...r,
    nom: allTrads[r.id]?.nom || r.nom,
    description: allTrads[r.id]?.description || "",
  }));

  return NextResponse.json({ restaurants: result });
}