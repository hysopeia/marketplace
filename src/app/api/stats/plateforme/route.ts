import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function estSuperAdmin(supabase: ReturnType<typeof createClient>): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("super_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return !!data;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const periode = parseInt(searchParams.get("periode") || "30", 10);

  const supabase = createClient();

  if (!(await estSuperAdmin(supabase))) {
    return NextResponse.json({ error: "Acces reserve au super_admin" }, { status: 403 });
  }

  const dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() - periode);
  const datePrecedente = new Date();
  datePrecedente.setDate(datePrecedente.getDate() - periode * 2);

  // --- Restaurants : total + croissance ---
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("id, nom, tier, created_at, statut_abonnement");

  const totalRestaurants = restaurants?.length || 0;
  const nouveauxRestaurants = (restaurants || []).filter(
    (r) => new Date(r.created_at) >= dateDebut
  ).length;

  const parTier: Record<string, number> = {};
  for (const r of restaurants || []) {
    parTier[r.tier] = (parTier[r.tier] || 0) + 1;
  }

  // --- Commandes plateforme (periode actuelle + precedente) ---
  const { data: commandesActuelles } = await supabase
    .from("commandes")
    .select("id, restaurant_id, created_at, montant_total, statut")
    .gte("created_at", dateDebut.toISOString())
    .not("statut", "eq", "annulee");

  const { data: commandesPrecedentes } = await supabase
    .from("commandes")
    .select("montant_total")
    .gte("created_at", datePrecedente.toISOString())
    .lt("created_at", dateDebut.toISOString())
    .not("statut", "eq", "annulee");

  const revenuActuel = (commandesActuelles || []).reduce((s, c) => s + Number(c.montant_total), 0);
  const revenuPrecedent = (commandesPrecedentes || []).reduce((s, c) => s + Number(c.montant_total), 0);
  const evolutionRevenu = revenuPrecedent > 0
    ? Math.round(((revenuActuel - revenuPrecedent) / revenuPrecedent) * 100)
    : null;

  // Revenu plateforme par jour (courbe)
  const parJour: Record<string, number> = {};
  for (const c of commandesActuelles || []) {
    const jour = formatDate(new Date(c.created_at));
    parJour[jour] = (parJour[jour] || 0) + Number(c.montant_total);
  }
  const evolutionJournaliere = Object.entries(parJour)
    .map(([date, revenu]) => ({ date, revenu }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // --- Top restaurants par revenu sur la periode ---
  const revenuParRestaurant: Record<string, number> = {};
  for (const c of commandesActuelles || []) {
    revenuParRestaurant[c.restaurant_id] = (revenuParRestaurant[c.restaurant_id] || 0) + Number(c.montant_total);
  }
  const nomsRestaurants: Record<string, string> = {};
  for (const r of restaurants || []) nomsRestaurants[r.id] = r.nom;

  const topRestaurants = Object.entries(revenuParRestaurant)
    .map(([id, revenu]) => ({ nom: nomsRestaurants[id] || "?", revenu }))
    .sort((a, b) => b.revenu - a.revenu)
    .slice(0, 5);

  // --- Satisfaction globale (clients, toutes plateformes confondues) ---
  const { data: avisClients } = await supabase
    .from("avis")
    .select("positif")
    .eq("auteur_type", "client");

  const totalAvis = avisClients?.length || 0;
  const positifs = avisClients?.filter((a) => a.positif).length || 0;
  const satisfaction = totalAvis > 0 ? Math.round((positifs / totalAvis) * 100) : null;

  return NextResponse.json({
    periode,
    totalRestaurants,
    nouveauxRestaurants,
    parTier,
    revenuActuel,
    evolutionRevenu,
    nombreCommandes: (commandesActuelles || []).length,
    evolutionJournaliere,
    topRestaurants,
    satisfaction,
    totalAvis,
  });
}
