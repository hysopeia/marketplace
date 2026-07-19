import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Chiffres publics, agreges et non sensibles, pour la preuve sociale
// de la page "Devenir partenaire". Pas d'authentification requise —
// mais rien ici n'expose de donnee individuelle (pas de nom de
// restaurant, pas de client, pas de montant).
export async function GET() {
  const supabase = createClient();

  const { count: totalRestaurants } = await supabase
    .from("restaurants")
    .select("*", { count: "exact", head: true })
    .eq("statut_abonnement", "actif");

  const { data: avis } = await supabase
    .from("avis")
    .select("positif")
    .eq("auteur_type", "client")
    .eq("visible", true);

  const totalAvis = avis?.length || 0;
  const positifs = avis?.filter((a) => a.positif).length || 0;
  const satisfaction = totalAvis > 0 ? Math.round((positifs / totalAvis) * 100) : null;

  const { count: totalCommandes } = await supabase
    .from("commandes")
    .select("*", { count: "exact", head: true })
    .not("statut", "eq", "annulee");

  return NextResponse.json({
    totalRestaurants: totalRestaurants || 0,
    satisfaction,
    totalAvis,
    totalCommandes: totalCommandes || 0,
  });
}
