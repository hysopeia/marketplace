import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function verifierAcces(
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
    .in("role", ["owner", "manager"])
    .maybeSingle();

  return !!data;
}

// GET ?restaurantId=...&toutes=true  → toutes (dashboard owner/manager)
// GET ?restaurantId=...              → uniquement actives + dans la fenetre de dates (fiche publique)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId");
  const toutes = searchParams.get("toutes");

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId requis" }, { status: 400 });
  }

  const supabase = createClient();

  let query = supabase
    .from("annonces")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (toutes !== "true") {
    const aujourdhui = new Date().toISOString().slice(0, 10);
    query = query
      .eq("actif", true)
      .or(`date_debut.is.null,date_debut.lte.${aujourdhui}`)
      .or(`date_fin.is.null,date_fin.gte.${aujourdhui}`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ annonces: data || [] });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurantId, titre, description, imageUrl, dateDebut, dateFin } = body;

    if (!restaurantId || !titre) {
      return NextResponse.json({ error: "restaurantId et titre requis" }, { status: 400 });
    }

    const supabase = createClient();

    if (!(await verifierAcces(supabase, restaurantId))) {
      return NextResponse.json({ error: "Acces reserve au owner/manager" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("annonces")
      .insert({
        restaurant_id: restaurantId,
        titre,
        description: description || null,
        image_url: imageUrl || null,
        date_debut: dateDebut || null,
        date_fin: dateFin || null,
        actif: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, annonce: data });
  } catch (error) {
    console.error("Erreur POST annonce:", error);
    return NextResponse.json({ error: "Erreur interne serveur" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, restaurantId, titre, description, imageUrl, dateDebut, dateFin, actif } = body;

    if (!id || !restaurantId) {
      return NextResponse.json({ error: "id et restaurantId requis" }, { status: 400 });
    }

    const supabase = createClient();

    if (!(await verifierAcces(supabase, restaurantId))) {
      return NextResponse.json({ error: "Acces reserve au owner/manager" }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    if (titre !== undefined) updates.titre = titre;
    if (description !== undefined) updates.description = description;
    if (imageUrl !== undefined) updates.image_url = imageUrl;
    if (dateDebut !== undefined) updates.date_debut = dateDebut;
    if (dateFin !== undefined) updates.date_fin = dateFin;
    if (actif !== undefined) updates.actif = actif;

    const { error } = await supabase
      .from("annonces")
      .update(updates)
      .eq("id", id)
      .eq("restaurant_id", restaurantId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur PATCH annonce:", error);
    return NextResponse.json({ error: "Erreur interne serveur" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const restaurantId = searchParams.get("restaurantId");

  if (!id || !restaurantId) {
    return NextResponse.json({ error: "id et restaurantId requis" }, { status: 400 });
  }

  const supabase = createClient();

  if (!(await verifierAcces(supabase, restaurantId))) {
    return NextResponse.json({ error: "Acces reserve au owner/manager" }, { status: 403 });
  }

  const { error } = await supabase
    .from("annonces")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
