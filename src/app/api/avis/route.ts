import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Verifie que l'utilisateur connecte est bien super_admin.
 * Utilise pour proteger la moderation (voir tous les avis clients,
 * masquer/afficher un avis).
 */
async function estSuperAdmin(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("super_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return !!data;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurantId, auteurType, auteurNom, positif, commentaire } = body;

    if (!restaurantId || !auteurType || typeof positif !== "boolean") {
      return NextResponse.json(
        { error: "Parametres manquants: restaurantId, auteurType, positif" },
        { status: 400 }
      );
    }

    if (!["client", "proprietaire"].includes(auteurType)) {
      return NextResponse.json({ error: "auteurType invalide" }, { status: 400 });
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from("avis")
      .insert({
        restaurant_id: restaurantId,
        auteur_type: auteurType,
        auteur_nom: auteurNom || null,
        positif,
        commentaire: commentaire || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Erreur creation avis:", error);
      return NextResponse.json({ error: "Erreur lors de l'enregistrement" }, { status: 500 });
    }

    return NextResponse.json({ success: true, avis: data });
  } catch (error) {
    console.error("Erreur API avis:", error);
    return NextResponse.json({ error: "Erreur interne serveur" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId");
  const scope = searchParams.get("scope"); // 'restaurant' | 'plateforme'

  const supabase = createClient();

  if (scope === "plateforme") {
    // Stats globales plateforme (super_admin) : total likes clients
    // + temoignages proprietaires uniquement.
    const { data: avisClients } = await supabase
      .from("avis")
      .select("positif")
      .eq("auteur_type", "client");

    const { data: temoignages } = await supabase
      .from("avis")
      .select("*")
      .eq("auteur_type", "proprietaire")
      .order("created_at", { ascending: false });

    const total = avisClients?.length || 0;
    const positifs = avisClients?.filter((a) => a.positif).length || 0;
    const pourcentageSatisfaction = total > 0 ? Math.round((positifs / total) * 100) : null;

    return NextResponse.json({
      totalAvisClients: total,
      totalLikes: positifs,
      pourcentageSatisfaction,
      temoignagesProprietaires: temoignages || [],
    });
  }

  if (scope === "moderation") {
    // Reserve au super_admin : liste de TOUS les avis clients, y compris
    // ceux masques, avec le nom du restaurant pour s'y retrouver.
    const supabaseCheck = createClient();
    if (!(await estSuperAdmin(supabaseCheck))) {
      return NextResponse.json({ error: "Acces reserve au super_admin" }, { status: 403 });
    }

    const { data: avisModeration, error: erreurModeration } = await supabase
      .from("avis")
      .select("*, restaurants(nom)")
      .eq("auteur_type", "client")
      .order("created_at", { ascending: false });

    if (erreurModeration) {
      return NextResponse.json({ error: erreurModeration.message }, { status: 500 });
    }

    return NextResponse.json({ avis: avisModeration || [] });
  }

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId requis" }, { status: 400 });
  }

  // Stats + commentaires d'UN restaurant (dashboard owner/manager/staff)
  const { data: avis, error } = await supabase
    .from("avis")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("auteur_type", "client")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total = avis?.length || 0;
  const positifs = avis?.filter((a) => a.positif).length || 0;
  const pourcentageSatisfaction = total > 0 ? Math.round((positifs / total) * 100) : null;

  return NextResponse.json({
    totalAvis: total,
    totalLikes: positifs,
    pourcentageSatisfaction,
    avis: avis || [],
  });
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient();

    if (!(await estSuperAdmin(supabase))) {
      return NextResponse.json({ error: "Acces reserve au super_admin" }, { status: 403 });
    }

    const body = await request.json();
    const { id, visible } = body;

    if (!id || typeof visible !== "boolean") {
      return NextResponse.json({ error: "Parametres manquants: id, visible" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("avis")
      .update({ visible })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, avis: data });
  } catch (error) {
    console.error("Erreur PATCH avis:", error);
    return NextResponse.json({ error: "Erreur interne serveur" }, { status: 500 });
  }
}
