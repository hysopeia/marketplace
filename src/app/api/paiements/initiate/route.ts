import { NextRequest, NextResponse } from "next/server";
import { getProviderForCountry, getProviderByName } from "@/lib/payments/resolve-provider";

/**
 * API route d'initiation de paiement.
 * Ne JAMAIS appeler un SDK de paiement directement.
 * Toujours passer par getProviderForCountry()/getProviderByName() + l'interface PaymentProvider.
 * Section 6 du spec.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { montant, devise, pays, reference, type, restaurantId, provider: nomProvider, telephone, methode } = body;

    if (!montant || !devise || !pays || !reference) {
      return NextResponse.json(
        { error: "Parametres manquants: montant, devise, pays, reference" },
        { status: 400 }
      );
    }

    if (montant <= 0) {
      return NextResponse.json(
        { error: "Le montant doit etre superieur a 0" },
        { status: 400 }
      );
    }

    // ElyonPay necessite le numero du client (paiement pousse directement
    // au telephone), contrairement a CinetPay qui fournit un lien a scanner.
    if (nomProvider === "elyonpay" && !telephone) {
      return NextResponse.json(
        { error: "Le numero de telephone du client est requis pour ElyonPay" },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Construire les URLs de callback selon le type
    let callbackUrl = "";
    let returnUrl = "";

    if (type === "reservation") {
      callbackUrl = `${appUrl}/api/paiements/webhook/cinetpay?type=reservation&ref=${reference}`;
      returnUrl = `${appUrl}/fr/ci/mon-resto-pilote?payment=success&ref=${reference}`;
    } else if (type === "commande") {
      callbackUrl = `${appUrl}/api/paiements/webhook/cinetpay?type=commande&ref=${reference}`;
      returnUrl = `${appUrl}/fr/ci/mon-resto-pilote?payment=success&ref=${reference}`;
    } else {
      callbackUrl = `${appUrl}/api/paiements/webhook/cinetpay?ref=${reference}`;
      returnUrl = `${appUrl}/fr`;
    }

    // Resolution du provider : choix explicite (caisse) sinon par pays (JAMAIS code en dur)
    const provider = nomProvider ? getProviderByName(nomProvider) : getProviderForCountry(pays);

    console.log(`[Paiement] Initiation pour pays=${pays}, montant=${montant} ${devise}, provider=${provider.nom}, reference=${reference}`);

    // Verifier si les cles du provider choisi sont configurees
    const clesManquantes =
      provider.nom === "elyonpay"
        ? !process.env.ELYONPAY_API_KEY
        : !process.env.CINETPAY_API_KEY || !process.env.CINETPAY_SITE_ID;

    if (clesManquantes) {
      console.warn(`[Paiement] Cles ${provider.nom} non configurees. Mode test active.`);

      // Mode test : simuler un paiement reussi
      return NextResponse.json({
        success: true,
        testMode: true,
        message: `Mode test : cles ${provider.nom} non configurees. Le paiement est simule comme reussi.`,
        paymentUrl: `${appUrl}/api/paiements/webhook/cinetpay?test=true&ref=${reference}&montant=${montant}&devise=${devise}&type=${type || "commande"}`,
        transactionId: `test_${Date.now()}`,
        providerName: provider.nom,
      });
    }

    // Appel du provider via l'interface (production)
    const result = await provider.initierPaiement({
      montant,
      devise,
      pays,
      reference,
      callbackUrl,
      telephone,
      methode,
    } as any);

    // Enregistrer le paiement en base
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();

    await supabase.from("paiements").insert({
      montant,
      devise,
      provider: provider.nom.toLowerCase(),
      reference_externe: result.transactionId,
      reference_interne: reference,
      statut: "en_attente",
      metadata: { type, restaurantId, pays },
    });

    return NextResponse.json({
      success: true,
      testMode: false,
      paymentUrl: result.paymentUrl,
      transactionId: result.transactionId,
      providerName: provider.nom,
    });
  } catch (error) {
    console.error("[Paiement] Erreur initiation:", error);
    return NextResponse.json(
      { error: "Erreur interne serveur" },
      { status: 500 }
    );
  }
}