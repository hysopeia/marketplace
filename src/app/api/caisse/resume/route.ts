import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function verifierAccesCaisse(
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
    .in("role", ["owner", "manager", "staff"])
    .maybeSingle();

  return !!data;
}

// Resume caisse du jour : total encaisse, nombre de transactions,
// repartition par mode de paiement (especes / mobile money), et les
// dernieres transactions reussies — toutes donnees reelles issues de
// la table paiements (aucun chiffre invente).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId");

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId requis" }, { status: 400 });
  }

  const supabase = createClient();

  if (!(await verifierAccesCaisse(supabase, restaurantId))) {
    return NextResponse.json({ error: "Acces reserve au personnel du restaurant" }, { status: 403 });
  }

  const { data: commandesRestaurant } = await supabase
    .from("commandes")
    .select("id")
    .eq("restaurant_id", restaurantId);

  const commandeIds = (commandesRestaurant || []).map((c) => c.id);

  if (commandeIds.length === 0) {
    return NextResponse.json({
      totalEncaisse: 0,
      nombreTransactions: 0,
      totalMobileMoney: 0,
      totalEspeces: 0,
      devise: null,
      dernieresTransactions: [],
    });
  }

  const debutJour = new Date();
  debutJour.setHours(0, 0, 0, 0);

  const { data: paiements } = await supabase
    .from("paiements")
    .select("id, montant, devise, provider, created_at, commande_id")
    .in("commande_id", commandeIds)
    .eq("statut", "reussi")
    .gte("created_at", debutJour.toISOString())
    .order("created_at", { ascending: false });

  const liste = paiements || [];

  const totalEncaisse = liste.reduce((s, p) => s + Number(p.montant), 0);
  const totalEspeces = liste.filter((p) => p.provider === "especes").reduce((s, p) => s + Number(p.montant), 0);
  const totalMobileMoney = totalEncaisse - totalEspeces;
  const devise = liste[0]?.devise || null;

  return NextResponse.json({
    totalEncaisse,
    nombreTransactions: liste.length,
    totalMobileMoney,
    totalEspeces,
    devise,
    dernieresTransactions: liste.slice(0, 10).map((p) => ({
      id: p.id,
      montant: p.montant,
      devise: p.devise,
      provider: p.provider,
      quandISO: p.created_at,
    })),
  });
}
