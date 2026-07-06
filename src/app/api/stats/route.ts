import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId");
  const periode = parseInt(searchParams.get("periode") || "30", 10);

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId requis" }, { status: 400 });
  }

  const supabase = createClient();

  const dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() - periode);
  const datePrecedente = new Date();
  datePrecedente.setDate(datePrecedente.getDate() - periode * 2);

  // --- Commandes de la periode + de la periode precedente (pour comparaison) ---
  const { data: commandesActuelles } = await supabase
    .from("commandes")
    .select("id, created_at, montant_total, statut, type")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", dateDebut.toISOString());

  const { data: commandesPrecedentes } = await supabase
    .from("commandes")
    .select("montant_total")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", datePrecedente.toISOString())
    .lt("created_at", dateDebut.toISOString())
    .not("statut", "eq", "annulee");

  const commandesValides = (commandesActuelles || []).filter((c) => c.statut !== "annulee");

  // Revenu total + evolution vs periode precedente
  const revenuActuel = commandesValides.reduce((s, c) => s + Number(c.montant_total), 0);
  const revenuPrecedent = (commandesPrecedentes || []).reduce((s, c) => s + Number(c.montant_total), 0);
  const evolutionRevenu = revenuPrecedent > 0
    ? Math.round(((revenuActuel - revenuPrecedent) / revenuPrecedent) * 100)
    : null;

  // Revenu et nombre de commandes par jour (pour la courbe)
  const parJour: Record<string, { revenu: number; commandes: number }> = {};
  for (const c of commandesValides) {
    const jour = formatDate(new Date(c.created_at));
    if (!parJour[jour]) parJour[jour] = { revenu: 0, commandes: 0 };
    parJour[jour].revenu += Number(c.montant_total);
    parJour[jour].commandes += 1;
  }
  const evolutionJournaliere = Object.entries(parJour)
    .map(([date, v]) => ({ date, revenu: v.revenu, commandes: v.commandes }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Panier moyen
  const panierMoyen = commandesValides.length > 0 ? Math.round(revenuActuel / commandesValides.length) : 0;

  // Repartition retrait / sur place
  const parType: Record<string, number> = {};
  for (const c of commandesValides) {
    parType[c.type] = (parType[c.type] || 0) + 1;
  }

  // --- Plats les plus vendus ---
  const idsCommandes = commandesValides.map((c) => c.id);
  let topPlats: { nom: string; quantite: number; revenu: number }[] = [];

  if (idsCommandes.length > 0) {
    const { data: items } = await supabase
      .from("commande_items")
      .select("menu_item_id, quantite, prix_unitaire")
      .in("commande_id", idsCommandes);

    const parPlat: Record<string, { quantite: number; revenu: number }> = {};
    for (const it of items || []) {
      if (!it.menu_item_id) continue;
      if (!parPlat[it.menu_item_id]) parPlat[it.menu_item_id] = { quantite: 0, revenu: 0 };
      parPlat[it.menu_item_id].quantite += it.quantite;
      parPlat[it.menu_item_id].revenu += it.quantite * Number(it.prix_unitaire);
    }

    const platIds = Object.keys(parPlat);
    if (platIds.length > 0) {
      const { data: trads } = await supabase
        .from("traductions")
        .select("entite_id, valeur")
        .eq("entite_type", "menu_item")
        .eq("champ", "nom")
        .eq("langue", "fr")
        .in("entite_id", platIds);

      const nomsMap: Record<string, string> = {};
      for (const t of trads || []) nomsMap[t.entite_id] = t.valeur;

      topPlats = platIds
        .map((id) => ({
          nom: nomsMap[id] || "Plat",
          quantite: parPlat[id].quantite,
          revenu: parPlat[id].revenu,
        }))
        .sort((a, b) => b.quantite - a.quantite)
        .slice(0, 5);
    }
  }

  // --- Reservations de la periode ---
  const { data: reservations } = await supabase
    .from("reservations")
    .select("id, statut, nb_personnes, date_reservation")
    .eq("restaurant_id", restaurantId)
    .gte("date_reservation", formatDate(dateDebut));

  const totalReservations = reservations?.length || 0;
  const noShows = reservations?.filter((r) => r.statut === "no_show").length || 0;
  const tauxNoShow = totalReservations > 0 ? Math.round((noShows / totalReservations) * 100) : 0;
  const moyenneCouverts = totalReservations > 0
    ? Math.round((reservations || []).reduce((s, r) => s + r.nb_personnes, 0) / totalReservations)
    : 0;

  // --- Repartition des moyens de paiement ---
  let paiementsParMode: Record<string, number> = {};
  if (idsCommandes.length > 0) {
    const { data: paiements } = await supabase
      .from("paiements")
      .select("provider, montant")
      .in("commande_id", idsCommandes)
      .eq("statut", "reussi");

    for (const p of paiements || []) {
      paiementsParMode[p.provider] = (paiementsParMode[p.provider] || 0) + Number(p.montant);
    }
  }

  // --- Satisfaction (reutilise le systeme d'avis existant) ---
  const { data: avis } = await supabase
    .from("avis")
    .select("positif")
    .eq("restaurant_id", restaurantId)
    .eq("auteur_type", "client");

  const totalAvis = avis?.length || 0;
  const positifs = avis?.filter((a) => a.positif).length || 0;
  const satisfaction = totalAvis > 0 ? Math.round((positifs / totalAvis) * 100) : null;

  return NextResponse.json({
    periode,
    revenuActuel,
    evolutionRevenu,
    nombreCommandes: commandesValides.length,
    panierMoyen,
    evolutionJournaliere,
    parType,
    topPlats,
    totalReservations,
    tauxNoShow,
    moyenneCouverts,
    paiementsParMode,
    satisfaction,
    totalAvis,
  });
}
