import { createClient } from "@/lib/supabase/server";
import { envoyerNotificationWhatsApp } from "@/lib/whatsapp/send";

type Commande = {
  id: string;
  restaurant_id: string;
  client_id: string | null;
  montant_total: number;
};

/**
 * A appeler juste apres qu'une commande soit passee au statut
 * "recuperee" (le declencheur SQL attribuant_points_fidelite tourne
 * dans la meme transaction que l'update, donc points_fidelite_clients
 * est deja a jour au moment de cet appel).
 *
 * Envoie soit :
 * - "recompense_atteinte" si le client vient de franchir le seuil
 *   avec cette commande (message unique, plus valorisant) ;
 * - sinon "points_fidelite_gagnes" si des points ont ete attribues.
 *
 * Echec silencieux (log uniquement) : une notification manquee ne doit
 * jamais faire echouer la validation d'une commande.
 */
export async function notifierPointsFidelite(
  supabase: ReturnType<typeof createClient>,
  commande: Commande
): Promise<void> {
  try {
    if (!commande.client_id) return;

    const { data: config } = await supabase
      .from("programme_fidelite")
      .select("actif, points_par_fcfa, seuil_recompense, description_recompense")
      .eq("restaurant_id", commande.restaurant_id)
      .eq("actif", true)
      .maybeSingle();

    if (!config) return;

    const pointsGagnes = Math.floor(commande.montant_total * config.points_par_fcfa);
    if (pointsGagnes <= 0) return;

    const { data: solde } = await supabase
      .from("points_fidelite_clients")
      .select("points_actuels")
      .eq("restaurant_id", commande.restaurant_id)
      .eq("client_id", commande.client_id)
      .maybeSingle();

    if (!solde) return;

    const pointsTotal = solde.points_actuels;
    const pointsAvant = pointsTotal - pointsGagnes;
    const seuilFranchiCetteCommande = pointsAvant < config.seuil_recompense && pointsTotal >= config.seuil_recompense;

    const { data: client } = await supabase
      .from("clients")
      .select("telephone, langue_preferee")
      .eq("id", commande.client_id)
      .maybeSingle();

    if (!client?.telephone) return;

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("nom, pays")
      .eq("id", commande.restaurant_id)
      .maybeSingle();

    if (!restaurant) return;

    await envoyerNotificationWhatsApp({
      telephone: client.telephone,
      pays: restaurant.pays,
      langue: (client.langue_preferee as "fr" | "en" | "es" | "pt") || "fr",
      typeEvenement: seuilFranchiCetteCommande ? "recompense_atteinte" : "points_fidelite_gagnes",
      templateParams: {
        restaurantNom: restaurant.nom,
        points: pointsGagnes,
        pointsTotal,
        seuilRecompense: config.seuil_recompense,
        descriptionRecompense: config.description_recompense,
      },
    });
  } catch (error) {
    console.error("[WhatsApp] Erreur notification points fidelite:", error);
  }
}
