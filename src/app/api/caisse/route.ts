import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { genererQrCode } from "@/lib/qrcode/generate";
import { notifierPointsFidelite } from "@/lib/whatsapp/fidelite";

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurantId, tableId, commandeId, montant, methodePaiement, fournisseur, telephone } = body;

    if (!restaurantId || !methodePaiement) {
      return NextResponse.json(
        { error: "restaurantId et methodePaiement requis" },
        { status: 400 }
      );
    }

    if (!["qr", "especes"].includes(methodePaiement)) {
      return NextResponse.json({ error: "methodePaiement invalide" }, { status: 400 });
    }

    const supabase = createClient();

    if (!(await verifierAccesCaisse(supabase, restaurantId))) {
      return NextResponse.json({ error: "Acces reserve au personnel du restaurant" }, { status: 403 });
    }

    const { data: restaurant, error: restoError } = await supabase
      .from("restaurants")
      .select("pays, devise")
      .eq("id", restaurantId)
      .single();

    if (restoError || !restaurant) {
      return NextResponse.json({ error: "Restaurant introuvable" }, { status: 404 });
    }

    let commande: any = null;

    if (commandeId) {
      // Vente liee a une commande existante (deja creee via l'app client
      // ou une precedente saisie) — on reutilise son montant.
      const { data, error } = await supabase
        .from("commandes")
        .select("*")
        .eq("id", commandeId)
        .eq("restaurant_id", restaurantId)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
      }
      commande = data;

      // Associe la table choisie a cette commande si elle n'en avait pas.
      if (tableId && !commande.table_id) {
        await supabase.from("commandes").update({ table_id: tableId }).eq("id", commandeId);
      }
    } else {
      // Nouvelle vente en caisse (walk-in), montant saisi directement
      // par le personnel — pas de client identifie necessairement.
      if (!montant || montant <= 0) {
        return NextResponse.json({ error: "Montant requis pour une nouvelle vente" }, { status: 400 });
      }

      const { data, error } = await supabase
        .from("commandes")
        .insert({
          restaurant_id: restaurantId,
          type: "sur_place",
          statut: "recue",
          montant_total: montant,
          devise: restaurant.devise,
          table_id: tableId || null,
        })
        .select()
        .single();

      if (error || !data) {
        return NextResponse.json({ error: "Erreur creation vente" }, { status: 500 });
      }
      commande = data;
    }

    // --- Paiement en especes : confirmation immediate, pas de provider ---
    if (methodePaiement === "especes") {
      const { data: paiement, error: paiementError } = await supabase
        .from("paiements")
        .insert({
          commande_id: commande.id,
          montant: commande.montant_total,
          devise: commande.devise,
          provider: "especes",
          statut: "reussi",
        })
        .select()
        .single();

      if (paiementError) {
        return NextResponse.json({ error: paiementError.message }, { status: 500 });
      }

      await supabase
        .from("commandes")
        .update({ statut: "recuperee", heure_recuperee: new Date().toISOString() })
        .eq("id", commande.id);

      await notifierPointsFidelite(supabase, commande);

      return NextResponse.json({
        success: true,
        methode: "especes",
        commandeId: commande.id,
        montant: commande.montant_total,
      });
    }

    // --- Paiement par QR mobile money : reutilise la route d'initiation
    // de paiement existante (gere deja le mode test + CinetPay reel) ---
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const initResponse = await fetch(`${baseUrl}/api/paiements/initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        montant: commande.montant_total,
        devise: commande.devise,
        pays: restaurant.pays,
        reference: commande.id,
        type: "commande",
        restaurantId,
        provider: fournisseur || "cinetpay",
        telephone: telephone || undefined,
      }),
    });

    const initData = await initResponse.json();

    if (!initResponse.ok || !initData.success) {
      return NextResponse.json(
        { error: initData.error || "Erreur initiation paiement" },
        { status: 500 }
      );
    }

    // ElyonPay (documente publiquement) pousse directement une
    // notification au telephone du client, sans lien a scanner —
    // pas de QR a generer dans ce cas, juste une attente de confirmation.
    let qrBase64 = "";
    if (initData.paymentUrl) {
      const qrBuffer = await genererQrCode({ url: initData.paymentUrl, taille: 280 });
      qrBase64 = `data:image/png;base64,${qrBuffer.toString("base64")}`;
    }

    return NextResponse.json({
      success: true,
      methode: "qr",
      commandeId: commande.id,
      transactionId: initData.transactionId,
      qrImage: qrBase64,
      montant: commande.montant_total,
      testMode: initData.testMode,
      fournisseur: fournisseur || "cinetpay",
    });
  } catch (error) {
    console.error("Erreur API caisse:", error);
    return NextResponse.json({ error: "Erreur interne serveur" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Verifie le statut d'un paiement QR en cours (polling cote client).
  const { searchParams } = new URL(request.url);
  const commandeId = searchParams.get("commandeId");

  if (!commandeId) {
    return NextResponse.json({ error: "commandeId requis" }, { status: 400 });
  }

  const supabase = createClient();

  const { data: commande, error } = await supabase
    .from("commandes")
    .select("statut")
    .eq("id", commandeId)
    .single();

  if (error || !commande) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  return NextResponse.json({ statut: commande.statut });
}
