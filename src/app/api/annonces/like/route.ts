import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Reaction "j'aime" simple : incrementation atomique cote base (via
// fonction SQL) pour eviter les race conditions. Pas d'authentification
// requise — un client anonyme peut liker une annonce publique. La
// protection anti-doublon (un like par visiteur) se fait cote navigateur
// (voir RestaurantDetail.tsx) : reste un compteur simple, pas un
// systeme de vote garanti infalsifiable.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { annonceId } = body;

    if (!annonceId) {
      return NextResponse.json({ error: "annonceId requis" }, { status: 400 });
    }

    const supabase = createClient();

    const { data, error } = await supabase.rpc("incrementer_likes_annonce", {
      annonce_id: annonceId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, likesCount: data });
  } catch (error) {
    console.error("Erreur like annonce:", error);
    return NextResponse.json({ error: "Erreur interne serveur" }, { status: 500 });
  }
}
