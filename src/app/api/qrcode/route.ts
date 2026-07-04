import { NextRequest, NextResponse } from "next/server";
import { genererQrCode } from "@/lib/qrcode/generate";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id, restaurantId, logoUrl } = body;

    if (!type || !id || !restaurantId) {
      return NextResponse.json(
        { error: "Parametres manquants: type, id, restaurantId" },
        { status: 400 }
      );
    }

    if (type !== "reservation" && type !== "commande") {
      return NextResponse.json(
        { error: "type doit etre 'reservation' ou 'commande'" },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const qrUrl = `${appUrl}/${type === "reservation" ? "r" : "c"}/${id}`;

    // Generer le QR en PNG avec logo et correction H
    const qrBuffer = await genererQrCode({
      url: qrUrl,
      logoUrl: logoUrl || undefined,
      taille: 300,
    });

    // Sauvegarder dans Supabase Storage
    const supabase = createClient();
    const fileName = `${type}/${id}.png`;

    const { error: uploadError } = await supabase.storage
      .from("qr-codes")
      .upload(fileName, qrBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Erreur upload QR:", uploadError);
      return NextResponse.json(
        { error: "Erreur lors de la sauvegarde du QR" },
        { status: 500 }
      );
    }

    // Obtenir l'URL publique du QR
    const { data: urlData } = supabase.storage
      .from("qr-codes")
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Mettre a jour le champ qr_code_url dans la table correspondante
    if (type === "reservation") {
      const { error: updateError } = await supabase
        .from("reservations")
        .update({ qr_code_url: publicUrl })
        .eq("id", id);

      if (updateError) {
        console.error("Erreur update reservation QR:", updateError);
      }
    } else {
      const { error: updateError } = await supabase
        .from("commandes")
        .update({ qr_code_url: publicUrl })
        .eq("id", id);

      if (updateError) {
        console.error("Erreur update commande QR:", updateError);
      }
    }

    return NextResponse.json({
      success: true,
      qrUrl: publicUrl,
      encodedUrl: qrUrl,
    });
  } catch (error) {
    console.error("Erreur generation QR:", error);
    return NextResponse.json(
      { error: "Erreur interne serveur" },
      { status: 500 }
    );
  }
}