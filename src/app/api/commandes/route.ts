import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { envoyerNotificationWhatsApp } from "@/lib/whatsapp/send";

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
    } = body;

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
    .select("id, type, statut, montant_total, devise, table_id, created_at")
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