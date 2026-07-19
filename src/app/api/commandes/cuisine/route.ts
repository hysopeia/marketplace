import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function verifierAcces(
  supabase: ReturnType<typeof createClient>,
  restaurantId: string
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("utilisateurs_restaurant")
    .select("role")
    .eq("user_id", user.id)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  return !!data;
}

// Commandes actives (recue / en_preparation / prete) avec le detail
// reel des plats commandes (nom + quantite), pour l'ecran cuisine.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId");

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId requis" }, { status: 400 });
  }

  const supabase = createClient();

  if (!(await verifierAcces(supabase, restaurantId))) {
    return NextResponse.json({ error: "Acces reserve au personnel du restaurant" }, { status: 403 });
  }

  const { data: commandes, error } = await supabase
    .from("commandes")
    .select("id, type, statut, table_id, created_at, heure_debut_preparation, heure_prete, heure_recuperee")
    .eq("restaurant_id", restaurantId)
    .in("statut", ["recue", "en_preparation", "prete"])
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const commandeIds = (commandes || []).map((c) => c.id);
  let itemsParCommande: Record<string, { nom: string; quantite: number }[]> = {};

  if (commandeIds.length > 0) {
    const { data: items } = await supabase
      .from("commande_items")
      .select("commande_id, quantite, menu_items(nom)")
      .in("commande_id", commandeIds);

    for (const it of items || []) {
      const nomPlat = (it as any).menu_items?.nom || "Plat";
      if (!itemsParCommande[it.commande_id]) itemsParCommande[it.commande_id] = [];
      itemsParCommande[it.commande_id].push({ nom: nomPlat, quantite: it.quantite });
    }
  }

  let tablesParId: Record<string, string> = {};
  const tableIds = (commandes || []).map((c) => c.table_id).filter(Boolean);
  if (tableIds.length > 0) {
    const { data: tables } = await supabase
      .from("tables")
      .select("id, nom")
      .in("id", tableIds);
    for (const tb of tables || []) tablesParId[tb.id] = tb.nom;
  }

  const resultat = (commandes || []).map((c) => ({
    id: c.id,
    type: c.type,
    statut: c.statut,
    createdAt: c.created_at,
    heureDebutPreparation: c.heure_debut_preparation,
    heurePrete: c.heure_prete,
    heureRecuperee: c.heure_recuperee,
    table: c.table_id ? tablesParId[c.table_id] || null : null,
    plats: itemsParCommande[c.id] || [],
  }));

  return NextResponse.json({ commandes: resultat });
}
