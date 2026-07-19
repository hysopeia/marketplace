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
    .select("id, nom, tier, created_at, statut_abonnement, ville, latitude, longitude");

  const totalRestaurants = restaurants?.length || 0;
  const nouveauxRestaurants = (restaurants || []).filter(
    (r) => new Date(r.created_at) >= dateDebut
  ).length;

  const parTier: Record<string, number> = {};
  for (const r of restaurants || []) {
    parTier[r.tier] = (parTier[r.tier] || 0) + 1;
  }

  // Estimation des revenus recurrents AfriTable (abonnements actifs
  // uniquement). Le pack de lancement est ponctuel (non recurrent) et le
  // tier "groupe" est sur devis — tous deux exclus de cette estimation
  // mensuelle pour ne pas fausser le chiffre.
  const PRIX_MENSUEL_PAR_TIER: Record<string, number> = { business: 25000 };
  const revenuPlateformeEstime = (restaurants || [])
    .filter((r) => r.statut_abonnement === "actif")
    .reduce((s, r) => s + (PRIX_MENSUEL_PAR_TIER[r.tier] || 0), 0);

  // --- Commandes plateforme (periode actuelle + precedente) ---
  const { data: commandesActuelles } = await supabase
    .from("commandes")
    .select("id, restaurant_id, client_id, created_at, montant_total, statut")
    .gte("created_at", dateDebut.toISOString())
    .not("statut", "eq", "annulee");

  const { data: commandesPrecedentes } = await supabase
    .from("commandes")
    .select("montant_total")
    .gte("created_at", datePrecedente.toISOString())
    .lt("created_at", dateDebut.toISOString())
    .not("statut", "eq", "annulee");

  const { data: reservationsActuelles } = await supabase
    .from("reservations")
    .select("id, client_id, created_at")
    .gte("created_at", dateDebut.toISOString());

  const revenuActuel = (commandesActuelles || []).reduce((s, c) => s + Number(c.montant_total), 0);
  const revenuPrecedent = (commandesPrecedentes || []).reduce((s, c) => s + Number(c.montant_total), 0);
  const evolutionRevenu = revenuPrecedent > 0
    ? Math.round(((revenuActuel - revenuPrecedent) / revenuPrecedent) * 100)
    : null;

  // --- Clients actifs sur la periode (au moins une commande ou reservation) ---
  const clientsActifsSet = new Set<string>();
  for (const c of commandesActuelles || []) {
    if (c.client_id) clientsActifsSet.add(c.client_id);
  }
  for (const r of reservationsActuelles || []) {
    if (r.client_id) clientsActifsSet.add(r.client_id);
  }
  const clientsActifs = clientsActifsSet.size;

  // Revenu plateforme par jour (courbe)
  const parJour: Record<string, number> = {};
  for (const c of commandesActuelles || []) {
    const jour = formatDate(new Date(c.created_at));
    parJour[jour] = (parJour[jour] || 0) + Number(c.montant_total);
  }
  const evolutionJournaliere = Object.entries(parJour)
    .map(([date, revenu]) => ({ date, revenu }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Nombre de commandes par jour (pour la mini-courbe de tendance de la
  // carte KPI "Commandes" — meme logique que le CA mais un comptage).
  const commandesParJour: Record<string, number> = {};
  for (const c of commandesActuelles || []) {
    const jour = formatDate(new Date(c.created_at));
    commandesParJour[jour] = (commandesParJour[jour] || 0) + 1;
  }
  const commandesJournalieres = Object.entries(commandesParJour)
    .map(([date, nombre]) => ({ date, nombre }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Nouveaux restaurants par jour (pour la mini-courbe de la carte KPI
  // "Restaurants") — meme logique, sur la date de creation du restaurant.
  const restaurantsParJour: Record<string, number> = {};
  for (const r of restaurants || []) {
    if (new Date(r.created_at) >= dateDebut) {
      const jour = formatDate(new Date(r.created_at));
      restaurantsParJour[jour] = (restaurantsParJour[jour] || 0) + 1;
    }
  }
  const restaurantsJournaliers = Object.entries(restaurantsParJour)
    .map(([date, nombre]) => ({ date, nombre }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // --- Top restaurants par revenu sur la periode ---
  const revenuParRestaurant: Record<string, number> = {};
  const commandesParRestaurant: Record<string, number> = {};
  for (const c of commandesActuelles || []) {
    revenuParRestaurant[c.restaurant_id] = (revenuParRestaurant[c.restaurant_id] || 0) + Number(c.montant_total);
    commandesParRestaurant[c.restaurant_id] = (commandesParRestaurant[c.restaurant_id] || 0) + 1;
  }
  const nomsRestaurants: Record<string, string> = {};
  for (const r of restaurants || []) nomsRestaurants[r.id] = r.nom;

  const topRestaurants = Object.entries(revenuParRestaurant)
    .map(([id, revenu]) => ({ nom: nomsRestaurants[id] || "?", revenu }))
    .sort((a, b) => b.revenu - a.revenu)
    .slice(0, 5);

  // --- Donnees geographiques pour la carte simplifiee (restaurants
  // ayant une localisation renseignee uniquement) ---
  const restaurantsGeo = (restaurants || [])
    .filter((r) => r.latitude != null && r.longitude != null)
    .map((r) => ({
      id: r.id,
      nom: r.nom,
      ville: r.ville,
      latitude: r.latitude,
      longitude: r.longitude,
      commandes: commandesParRestaurant[r.id] || 0,
    }));

  // --- Satisfaction globale (clients, toutes plateformes confondues) ---
  const { data: avisClients } = await supabase
    .from("avis")
    .select("positif")
    .eq("auteur_type", "client");

  const totalAvis = avisClients?.length || 0;
  const positifs = avisClients?.filter((a) => a.positif).length || 0;
  const satisfaction = totalAvis > 0 ? Math.round((positifs / totalAvis) * 100) : null;

  // --- Activite recente (flux temps reel simplifie) ---
  const { data: dernieresCommandes } = await supabase
    .from("commandes")
    .select("id, restaurant_id, montant_total, devise, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: derniersPaiements } = await supabase
    .from("paiements")
    .select("id, montant, devise, statut, created_at")
    .eq("statut", "reussi")
    .order("created_at", { ascending: false })
    .limit(5);

  const derniersRestaurants = (restaurants || [])
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  type EvenementActivite = { type: string; label: string; sousLabel: string; quandISO: string };
  const activite: EvenementActivite[] = [];

  for (const r of derniersRestaurants) {
    activite.push({
      type: "restaurant",
      label: "Nouveau restaurant inscrit",
      sousLabel: r.nom,
      quandISO: r.created_at,
    });
  }
  for (const c of dernieresCommandes || []) {
    activite.push({
      type: "commande",
      label: "Nouvelle commande",
      sousLabel: `${nomsRestaurants[c.restaurant_id] || "?"} — ${Number(c.montant_total).toLocaleString()} ${c.devise}`,
      quandISO: c.created_at,
    });
  }
  for (const p of derniersPaiements || []) {
    activite.push({
      type: "paiement",
      label: "Paiement recu",
      sousLabel: `${Number(p.montant).toLocaleString()} ${p.devise}`,
      quandISO: p.created_at,
    });
  }

  const activiteRecente = activite
    .sort((a, b) => new Date(b.quandISO).getTime() - new Date(a.quandISO).getTime())
    .slice(0, 8);

  return NextResponse.json({
    periode,
    totalRestaurants,
    nouveauxRestaurants,
    parTier,
    revenuActuel,
    evolutionRevenu,
    revenuPlateformeEstime,
    nombreCommandes: (commandesActuelles || []).length,
    clientsActifs,
    evolutionJournaliere,
    commandesJournalieres,
    restaurantsJournaliers,
    topRestaurants,
    restaurantsGeo,
    satisfaction,
    totalAvis,
    activiteRecente,
  });
}
