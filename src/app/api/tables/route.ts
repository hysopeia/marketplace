import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Determine le statut d'une table en temps reel :
 * - "occupee" si force manuellement
 * - "reservee" si une reservation confirmee couvre le creneau actuel
 *   (fenetre de +/- 90 minutes autour de l'heure de la reservation,
 *   le temps qu'un repas se deroule)
 * - "libre" sinon
 */
function calculerStatut(
  table: { statut_manuel: string | null },
  reservationsDeLaTable: { date_reservation: string; heure: string; statut: string }[]
): { statut: string; reservation: any | null } {
  if (table.statut_manuel === "occupee") {
    return { statut: "occupee", reservation: null };
  }

  const maintenant = new Date();
  const FENETRE_MS = 90 * 60 * 1000;

  for (const res of reservationsDeLaTable) {
    if (!["confirmee", "en_attente"].includes(res.statut)) continue;
    const heureRes = new Date(`${res.date_reservation}T${res.heure}`);
    const diff = Math.abs(maintenant.getTime() - heureRes.getTime());
    if (diff <= FENETRE_MS) {
      return { statut: "reservee", reservation: res };
    }
  }

  return { statut: "libre", reservation: null };
}

async function verifierAcces(
  supabase: ReturnType<typeof createClient>,
  restaurantId: string,
  rolesAutorises: string[]
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
    .in("role", rolesAutorises)
    .maybeSingle();

  return !!data;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId");

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId requis" }, { status: 400 });
  }

  const supabase = createClient();

  const { data: tables, error } = await supabase
    .from("tables_salle")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const { data: reservations } = await supabase
    .from("reservations")
    .select("id, table_id, date_reservation, heure, nb_personnes, statut")
    .eq("restaurant_id", restaurantId)
    .eq("date_reservation", aujourdhui)
    .not("table_id", "is", null);

  const tablesAvecStatut = (tables || []).map((table) => {
    const reservationsDeLaTable = (reservations || []).filter(
      (r) => r.table_id === table.id
    );
    const { statut, reservation } = calculerStatut(table, reservationsDeLaTable);
    return { ...table, statut, reservation };
  });

  return NextResponse.json({ tables: tablesAvecStatut });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurantId, nom, forme, capacite, positionX, positionY } = body;

    if (!restaurantId || !nom) {
      return NextResponse.json({ error: "restaurantId et nom requis" }, { status: 400 });
    }

    const supabase = createClient();

    if (!(await verifierAcces(supabase, restaurantId, ["owner", "manager"]))) {
      return NextResponse.json({ error: "Acces reserve au owner/manager" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("tables_salle")
      .insert({
        restaurant_id: restaurantId,
        nom,
        forme: forme || "carree",
        capacite: capacite || 2,
        position_x: positionX ?? 50,
        position_y: positionY ?? 50,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ table: data });
  } catch (error) {
    return NextResponse.json({ error: "Erreur interne serveur" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, restaurantId, ...updates } = body;

    if (!id || !restaurantId) {
      return NextResponse.json({ error: "id et restaurantId requis" }, { status: 400 });
    }

    const supabase = createClient();

    // Le personnel de salle/cuisine peut marquer une table "occupee"
    // (walk-in), mais seul owner/manager peut deplacer/reconfigurer.
    const champsReserves = ["nom", "forme", "capacite", "position_x", "position_y"];
    const toucheChampsReserves = Object.keys(updates).some((k) => champsReserves.includes(k));

    const rolesRequis = toucheChampsReserves
      ? ["owner", "manager"]
      : ["owner", "manager", "staff", "cuisine"];

    if (!(await verifierAcces(supabase, restaurantId, rolesRequis))) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("tables_salle")
      .update(updates)
      .eq("id", id)
      .eq("restaurant_id", restaurantId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ table: data });
  } catch (error) {
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

  if (!(await verifierAcces(supabase, restaurantId, ["owner", "manager"]))) {
    return NextResponse.json({ error: "Acces reserve au owner/manager" }, { status: 403 });
  }

  const { error } = await supabase
    .from("tables_salle")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
