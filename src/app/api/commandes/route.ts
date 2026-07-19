import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { envoyerNotificationWhatsApp } from "@/lib/whatsapp/send";
import { notifierPointsFidelite } from "@/lib/whatsapp/fidelite";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      restaurantId,
      items,
      type,
      heureRetrait,
      clientTelephone,
      clientNom,
      clientLangue,
      modePaiement,
      adresseLivraison,
    } = body;

    if (type === "livraison" && !adresseLivraison) {
      return NextResponse.json(
        { error: "adresseLivraison requise pour une commande en livraison" },
        { status: 400 }
      );
    }


    if (!restaurantId || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Parametres manquants: restaurantId, items" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Calculer le total
    let montantTotal = 0;
    for (const item of items) {
      montantTotal += item.prix_unitaire * item.quantite;
    }

    // Creer ou retrouver le client
    let clientId = null;
    if (clientTelephone) {
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("telephone", clientTelephone)
        .maybeSingle();

      if (existingClient) {
        clientId = existingClient.id;
        if (clientNom) {
          await supabase.from("clients").update({ nom: clientNom }).eq("id", clientId);
        }
      } else {
        const { data: newClient } = await supabase
          .from("clients")
          .insert({
            telephone: clientTelephone,
            nom: clientNom || null,
            langue_preferee: clientLangue || "fr",
          })
          .select("id")
          .single();
        clientId = newClient?.id;
      }
    }

    // Recuperer la devise du restaurant
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("devise, pays, telephone")
      .eq("id", restaurantId)
      .single();

    const devise = restaurant?.devise || "XOF";

    // Creer la commande
    const { data: commande, error: cmdError } = await supabase
      .from("commandes")
      .insert({
        restaurant_id: restaurantId,
        client_id: clientId,
        type: type || "retrait",
        heure_retrait_souhaitee: heureRetrait || null,
        statut: "recue",
        montant_total: montantTotal,
        devise: devise,
        mode_paiement: modePaiement || "en_ligne",
        adresse_livraison: type === "livraison" ? adresseLivraison : null,
      })
      .select()
      .single();

    if (cmdError || !commande) {
      console.error("Erreur creation commande:", cmdError);
      return NextResponse.json({ error: "Erreur creation commande" }, { status: 500 });
    }

    // Inserer les items de la commande
    const commandeItems = items.map((item: any) => ({
      commande_id: commande.id,
      menu_item_id: item.menu_item_id,
      quantite: item.quantite,
      prix_unitaire: item.prix_unitaire,
    }));

    const { error: itemsError } = await supabase
      .from("commande_items")
      .insert(commandeItems);

    if (itemsError) {
      console.error("Erreur insertion items:", itemsError);
    }

    // Generer le QR code
    let qrUrl = null;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const qrResponse = await fetch(`${baseUrl}/api/qrcode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "commande",
          id: commande.id,
          restaurantId: restaurantId,
        }),
      });
      const qrData = await qrResponse.json();
      if (qrData.success) qrUrl = qrData.qrUrl;
    } catch (qrError) {
      console.error("Erreur generation QR (non bloquante):", qrError);
    }

    // Envoyer la notification WhatsApp
    if (clientTelephone && restaurant) {
      const { data: trads } = await supabase
        .from("traductions")
        .select("valeur")
        .eq("entite_type", "restaurant")
        .eq("entite_id", restaurantId)
        .eq("langue", clientLangue || "fr")
        .eq("champ", "nom")
        .maybeSingle();

      const restaurantNom = trads?.valeur || "Restaurant";

      const formattedMontant = new Intl.NumberFormat("fr-FR", {
        style: "decimal",
        minimumFractionDigits: 0,
      }).format(montantTotal) + " " + devise;

      await envoyerNotificationWhatsApp({
        telephone: clientTelephone,
        pays: restaurant.pays,
        langue: (clientLangue as "fr" | "en" | "es" | "pt") || "fr",
        typeEvenement: "commande_recue",
        templateParams: {
          restaurantNom,
          heure: heureRetrait || undefined,
          montant: formattedMontant,
          type: type || "retrait",
          qrCodeUrl: qrUrl || "QR non disponible",
        },
      });
    }

    return NextResponse.json({
      success: true,
      commande: {
        id: commande.id,
        type: commande.type,
        statut: commande.statut,
        montant_total: commande.montant_total,
        devise: commande.devise,
        qr_code_url: qrUrl,
      },
    });
  } catch (error) {
    console.error("Erreur API commande:", error);
    return NextResponse.json({ error: "Erreur interne serveur" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId");
  const actives = searchParams.get("actives");

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId requis" }, { status: 400 });
  }

  const supabase = createClient();

  let query = supabase
    .from("commandes")
    .select("id, type, statut, montant_total, devise, table_id, created_at, heure_debut_preparation, heure_prete, heure_recuperee")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (actives === "true") {
    query = query.not("statut", "in", "(annulee,recuperee)");
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ commandes: data || [] });
}

async function verifierAccesStaff(
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

// Changement de statut d'une commande depuis le dashboard (personnel).
// Passe par le serveur (plutot qu'un update Supabase direct cote client)
// specifiquement pour pouvoir declencher la notification WhatsApp de
// points fidelite quand le statut devient "recuperee".
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, restaurantId, statut } = body;

    if (!id || !restaurantId || !statut) {
      return NextResponse.json({ error: "id, restaurantId et statut requis" }, { status: 400 });
    }

    const supabase = createClient();

    if (!(await verifierAccesStaff(supabase, restaurantId))) {
      return NextResponse.json({ error: "Acces reserve au personnel du restaurant" }, { status: 403 });
    }

    // Horodatage reel de l'etape franchie, en plus du statut — permet
    // d'afficher de vraies heures d'entree/sortie plutot qu'un simple
    // "X minutes ecoulees".
    const miseAJour: Record<string, unknown> = { statut };
    if (statut === "en_preparation") miseAJour.heure_debut_preparation = new Date().toISOString();
    if (statut === "prete") miseAJour.heure_prete = new Date().toISOString();
    if (statut === "recuperee") miseAJour.heure_recuperee = new Date().toISOString();

    const { data: commande, error } = await supabase
      .from("commandes")
      .update(miseAJour)
      .eq("id", id)
      .eq("restaurant_id", restaurantId)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (statut === "recuperee" && commande) {
      await notifierPointsFidelite(supabase, commande);
    }

    return NextResponse.json({ success: true, commande });
  } catch (error) {
    console.error("Erreur PATCH commande:", error);
    return NextResponse.json({ error: "Erreur interne serveur" }, { status: 500 });
  }
}