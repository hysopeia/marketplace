import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const LANGUES = ["fr", "en", "es", "pt"];

async function verifierAcces(
  supabase: ReturnType<typeof createClient>,
  restaurantId: string
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  // Le super_admin peut gerer le menu de n'importe quel restaurant
  // (ex: creation du menu initial lors de l'inscription du restaurant)
  const { data: superAdmin } = await supabase
    .from("super_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (superAdmin) return true;

  const { data } = await supabase
    .from("utilisateurs_restaurant")
    .select("role")
    .eq("user_id", user.id)
    .eq("restaurant_id", restaurantId)
    .in("role", ["owner", "manager"])
    .maybeSingle();

  return !!data;
}

/**
 * Enregistre le meme texte dans les 4 langues pour une entite donnee.
 * Simplification volontaire du MVP : pas d'interface de traduction
 * multi-langue pour l'instant, le proprietaire saisit en francais et
 * ce texte s'affiche pour tous — mieux qu'un "Sans nom"/"Plat" par
 * defaut pour les visiteurs anglophones/hispanophones/lusophones.
 */
async function enregistrerTraduction(
  supabase: ReturnType<typeof createClient>,
  entiteType: string,
  entiteId: string,
  champ: string,
  valeur: string
) {
  const lignes = LANGUES.map((langue) => ({
    entite_type: entiteType,
    entite_id: entiteId,
    langue,
    champ,
    valeur,
  }));

  await supabase
    .from("traductions")
    .upsert(lignes, { onConflict: "entite_type,entite_id,langue,champ" });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId");

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId requis" }, { status: 400 });
  }

  const supabase = createClient();

  const { data: categories, error: catError } = await supabase
    .from("categories_menu")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("ordre");

  if (catError) {
    return NextResponse.json({ error: catError.message }, { status: 500 });
  }

  const { data: items, error: itemsError } = await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at");

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const catIds = (categories || []).map((c) => c.id);
  const itemIds = (items || []).map((i) => i.id);

  const { data: trads } = await supabase
    .from("traductions")
    .select("entite_type, entite_id, champ, valeur")
    .eq("langue", "fr")
    .in("entite_id", [...catIds, ...itemIds]);

  const tradsMap: Record<string, { nom?: string; description?: string }> = {};
  for (const t of trads || []) {
    if (!tradsMap[t.entite_id]) tradsMap[t.entite_id] = {};
    if (t.champ === "nom") tradsMap[t.entite_id].nom = t.valeur;
    if (t.champ === "description") tradsMap[t.entite_id].description = t.valeur;
  }

  const categoriesAvecItems = (categories || []).map((cat) => ({
    id: cat.id,
    nom: tradsMap[cat.id]?.nom || "",
    ordre: cat.ordre,
    items: (items || [])
      .filter((i) => i.categorie_id === cat.id)
      .map((i) => ({
        id: i.id,
        nom: tradsMap[i.id]?.nom || "",
        description: tradsMap[i.id]?.description || "",
        prix: i.prix,
        photo_url: i.photo_url,
        disponible: i.disponible,
      })),
  }));

  return NextResponse.json({ categories: categoriesAvecItems });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurantId, action } = body;

    if (!restaurantId || !action) {
      return NextResponse.json({ error: "restaurantId et action requis" }, { status: 400 });
    }

    const supabase = createClient();

    if (!(await verifierAcces(supabase, restaurantId))) {
      return NextResponse.json({ error: "Acces reserve au owner/manager/super_admin" }, { status: 403 });
    }

    // Client admin pour les ecritures : necessaire car les policies RLS
    // de categories_menu/menu_items ne connaissent que owner/manager,
    // pas super_admin — l'acces a deja ete verifie cote application juste au-dessus.
    const adminClient = createAdminClient();

    if (action === "categorie") {
      const { nom } = body;
      if (!nom) return NextResponse.json({ error: "nom requis" }, { status: 400 });

      const { data: cat, error } = await adminClient
        .from("categories_menu")
        .insert({ restaurant_id: restaurantId, ordre: 0 })
        .select()
        .single();

      if (error || !cat) {
        return NextResponse.json({ error: error?.message || "Erreur creation" }, { status: 500 });
      }

      await enregistrerTraduction(adminClient, "categorie", cat.id, "nom", nom);

      return NextResponse.json({ success: true, categorie: { id: cat.id, nom } });
    }

    if (action === "plat") {
      const { categorieId, nom, description, prix, photoUrl } = body;
      if (!categorieId || !nom || !prix) {
        return NextResponse.json({ error: "categorieId, nom et prix requis" }, { status: 400 });
      }

      const { data: item, error } = await adminClient
        .from("menu_items")
        .insert({
          restaurant_id: restaurantId,
          categorie_id: categorieId,
          prix,
          photo_url: photoUrl || null,
          disponible: true,
        })
        .select()
        .single();

      if (error || !item) {
        return NextResponse.json({ error: error?.message || "Erreur creation" }, { status: 500 });
      }

      await enregistrerTraduction(adminClient, "menu_item", item.id, "nom", nom);
      if (description) {
        await enregistrerTraduction(adminClient, "menu_item", item.id, "description", description);
      }

      return NextResponse.json({ success: true, plat: { id: item.id, nom, prix } });
    }

    return NextResponse.json({ error: "action invalide" }, { status: 400 });
  } catch (error) {
    console.error("Erreur API menu:", error);
    return NextResponse.json({ error: "Erreur interne serveur" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurantId, type, id, nom, prix, disponible, photoUrl } = body;

    if (!restaurantId || !type || !id) {
      return NextResponse.json({ error: "restaurantId, type et id requis" }, { status: 400 });
    }

    const supabase = createClient();

    if (!(await verifierAcces(supabase, restaurantId))) {
      return NextResponse.json({ error: "Acces reserve au owner/manager/super_admin" }, { status: 403 });
    }

    const adminClient = createAdminClient();

    if (type === "plat") {
      const updates: Record<string, any> = {};
      if (prix !== undefined) updates.prix = prix;
      if (disponible !== undefined) updates.disponible = disponible;
      if (photoUrl !== undefined) updates.photo_url = photoUrl;

      if (Object.keys(updates).length > 0) {
        const { error } = await adminClient
          .from("menu_items")
          .update(updates)
          .eq("id", id)
          .eq("restaurant_id", restaurantId);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (nom) {
        await enregistrerTraduction(adminClient, "menu_item", id, "nom", nom);
      }

      return NextResponse.json({ success: true });
    }

    if (type === "categorie") {
      if (nom) {
        await enregistrerTraduction(adminClient, "categorie", id, "nom", nom);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "type invalide" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Erreur interne serveur" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type");
  const restaurantId = searchParams.get("restaurantId");

  if (!id || !type || !restaurantId) {
    return NextResponse.json({ error: "id, type et restaurantId requis" }, { status: 400 });
  }

  const supabase = createClient();

  if (!(await verifierAcces(supabase, restaurantId))) {
    return NextResponse.json({ error: "Acces reserve au owner/manager/super_admin" }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const table = type === "categorie" ? "categories_menu" : "menu_items";

  const { error } = await adminClient
    .from(table)
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
