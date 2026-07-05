import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Webhook CinetPay - Callback de paiement.
 * Reçoit les notifications de CinetPay quand un paiement change de statut.
 * En mode test, simule un paiement reussi directement.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testMode = searchParams.get("test");
    const reference = searchParams.get("ref");
    const montant = searchParams.get("montant");
    const devise = searchParams.get("devise");
    const type = searchParams.get("type");

    // Mode test : simuler un paiement reussi
    if (testMode === "true" && reference) {
      console.log(`[Webhook] Mode test - Simulation paiement reussi pour ref=${reference}`);

      const supabase = createClient();

      // Mettre a jour le statut du paiement
      const { data: paiement } = await supabase
        .from("paiements")
        .update({ statut: "reussi" })
        .eq("reference_interne", reference)
        .select()
        .maybeSingle();

      // Si c'est une reservation avec acompte, la marquer comme payee
      if (type === "reservation" && reference) {
        await supabase
          .from("reservations")
          .update({ acompte_statut: "paye" })
          .eq("id", reference);
      }

      // Si c'est une commande, la marquer comme recuperee (le paiement
      // cloture la vente — cas classique du mode caisse et des
      // precommandes payees en ligne). NOTE : on utilise "reference"
      // (= reference_interne = l'id de la commande) plutot que
      // paiements.commande_id, jamais renseigne par la route initiate.
      if (type === "commande" && reference) {
        await supabase
          .from("commandes")
          .update({ statut: "recuperee" })
          .eq("id", reference);
      }

      // Rediriger vers la page du restaurant avec un message de succes
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      return NextResponse.redirect(`${appUrl}/fr/ci/mon-resto-pilote?payment=success&ref=${reference}`);
    }

    return NextResponse.json({ error: "Parametres manquants" }, { status: 400 });
  } catch (error) {
    console.error("[Webhook] Erreur:", error);
    return NextResponse.json({ error: "Erreur interne serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verification de la signature CinetPay (en production)
    // En production, verifier le hash avec CINETPAY_SECRET_KEY
    // const signature = request.headers.get("x-cinetpay-signature");
    // const isValid = verifySignature(body, signature);
    // if (!isValid) return NextResponse.json({ error: "Signature invalide" }, { status: 401 });

    const { transaction_id, status, cpm_amount, cpm_currency } = body;

    if (!transaction_id) {
      return NextResponse.json({ error: "transaction_id manquant" }, { status: 400 });
    }

    console.log(`[Webhook] CinetPay callback: transaction_id=${transaction_id}, status=${status}`);

    const supabase = createClient();

    // Mettre a jour le statut du paiement
    let newStatut = "en_attente";
    if (status === "ACCEPTED") newStatut = "reussi";
    else if (status === "REFUSED") newStatut = "echoue";

    const { data: paiement } = await supabase
      .from("paiements")
      .update({ statut: newStatut })
      .eq("reference_externe", transaction_id)
      .select()
      .maybeSingle();

    // Si paiement reussi et c'est un acompte de reservation
    if (newStatut === "reussi" && paiement?.metadata?.type === "reservation" && paiement?.reference_interne) {
      await supabase
        .from("reservations")
        .update({ acompte_statut: "paye" })
        .eq("id", paiement.reference_interne);
    }

    // Si paiement reussi et c'est une commande (mode caisse ou
    // precommande en ligne), la marquer comme recuperee.
    if (newStatut === "reussi" && paiement?.metadata?.type === "commande" && paiement?.reference_interne) {
      await supabase
        .from("commandes")
        .update({ statut: "recuperee" })
        .eq("id", paiement.reference_interne);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Webhook] Erreur POST:", error);
    return NextResponse.json({ error: "Erreur interne serveur" }, { status: 500 });
  }
}