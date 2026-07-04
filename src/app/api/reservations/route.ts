import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { envoyerNotificationWhatsApp } from "@/lib/whatsapp/send";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurantId, date, heure, nbPersonnes, clientTelephone, clientNom, clientLangue } = body;

    if (!restaurantId || !date || !heure || !nbPersonnes) {
      return NextResponse.json(
        { error: "Parametres manquants: restaurantId, date, heure, nbPersonnes" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Verifier la disponibilite (anti-surbooking)
    const { data: creneaux } = await supabase
      .from("creneaux_capacite")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("jour_semaine", new Date(date + "T12:00:00").getDay())
      .gte("heure_debut", heure)
      .lt("heure_fin", heure);

    if (creneaux && creneaux.length > 0) {
      const creneau = creneaux[0];
      const { data: existingRes } = await supabase
        .from("reservations")
        .select("nb_personnes")
        .eq("restaurant_id", restaurantId)
        .eq("date_reservation", date)
        .eq("heure", heure)
        .not("statut", "in", '("annulee","no_show")');

      const reservedTotal = (existingRes || []).reduce((s: number, r: any) => s + r.nb_personnes, 0);
      if (reservedTotal + nbPersonnes > creneau.capacite_totale) {
        return NextResponse.json(
          { error: "Plus de place disponible pour ce creneau" },
          { status: 400 }
        );
      }
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
        // Mettre a jour le nom si fourni
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

    // Creer la reservation
    const { data: reservation, error: resError } = await supabase
      .from("reservations")
      .insert({
        restaurant_id: restaurantId,
        client_id: clientId,
        date_reservation: date,
        heure: heure,
        nb_personnes: nbPersonnes,
        statut: "en_attente",
      })
      .select()
      .single();

    if (resError || !reservation) {
      console.error("Erreur creation reservation:", resError);
      return NextResponse.json({ error: "Erreur creation reservation" }, { status: 500 });
    }

    // Generer le QR code
    let qrUrl = null;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const qrResponse = await fetch(`${baseUrl}/api/qrcode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "reservation",
          id: reservation.id,
          restaurantId: restaurantId,
        }),
      });
      const qrData = await qrResponse.json();
      if (qrData.success) qrUrl = qrData.qrUrl;
    } catch (qrError) {
      console.error("Erreur generation QR (non bloquante):", qrError);
    }

    // Recuperer les infos du restaurant pour la notification
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("nom, telephone, pays")
      .eq("id", restaurantId)
      .single();

    // Envoyer la notification WhatsApp
    if (clientTelephone && restaurant) {
      // Recuperer le nom traduit du restaurant
      const { data: trads } = await supabase
        .from("traductions")
        .select("valeur")
        .eq("entite_type", "restaurant")
        .eq("entite_id", restaurantId)
        .eq("langue", clientLangue || "fr")
        .eq("champ", "nom")
        .maybeSingle();

      const restaurantNom = trads?.valeur || restaurant.nom || "Restaurant";

      await envoyerNotificationWhatsApp({
        telephone: clientTelephone,
        pays: restaurant.pays,
        langue: (clientLangue as "fr" | "en" | "es" | "pt") || "fr",
        typeEvenement: "reservation_confirmee",
        templateParams: {
          restaurantNom,
          date,
          heure,
          nbPersonnes,
          qrCodeUrl: qrUrl || "QR non disponible",
        },
      });
    }

    return NextResponse.json({
      success: true,
      reservation: {
        id: reservation.id,
        date_reservation: reservation.date_reservation,
        heure: reservation.heure,
        nb_personnes: reservation.nb_personnes,
        statut: reservation.statut,
        qr_code_url: qrUrl,
      },
    });
  } catch (error) {
    console.error("Erreur API reservation:", error);
    return NextResponse.json({ error: "Erreur interne serveur" }, { status: 500 });
  }
}