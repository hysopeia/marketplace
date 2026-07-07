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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId");
  const toutes = searchParams.get("toutes"); // owner : voir aussi les inactives

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId requis" }, { status: 400 });
  }

  const supabase = createClient();

  let query = supabase
    .from("promotions")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (toutes !== "true") {
    query = query.eq("actif", true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ promotions: data || [] });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurantId, texte } = body;

    if (!restaurantId || !texte) {
      return NextResponse.json({ error: "restaurantId et texte requis" }, { status: 400 });
    }

    const supabase = createClient();

    if (!(await verifierAcces(supabase, restaurantId))) {
      return NextResponse.json({ error: "Acces reserve au owner/manager" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("promotions")
      .insert({ restaurant_id: restaurantId, texte, actif: true })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, promotion: data });
  } catch (error) {
    return NextResponse.json({ error: "Erreur interne serveur" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, restaurantId, actif } = body;

  if (!id || !restaurantId) {
    return NextResponse.json({ error: "id et restaurantId requis" }, { status: 400 });
  }

  const supabase = createClient();

  if (!(await verifierAcces(supabase, restaurantId))) {
    return NextResponse.json({ error: "Acces reserve au owner/manager" }, { status: 403 });
  }

  const { error } = await supabase
    .from("promotions")
    .update({ actif })
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
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
    .from("promotions")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
