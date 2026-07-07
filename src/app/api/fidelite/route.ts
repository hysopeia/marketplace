import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const telephone = searchParams.get("telephone");

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId requis" }, { status: 400 });
  }

  const supabase = createClient();

  const { data: config } = await supabase
    .from("programme_fidelite")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (!telephone) {
    return NextResponse.json({ config: config || null });
  }

  // Consultation publique du solde (visiteur non connecte) : client admin
  // necessaire car la lecture de points_fidelite_clients est normalement
  // reservee au owner/manager. La recherche exacte par telephone limite
  // le risque a une consultation cibree, pas un acces large aux donnees.
  const adminClient = createAdminClient();

  const { data: client } = await adminClient
    .from("clients")
    .select("id")
    .eq("telephone", telephone)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ config: config || null, inscrit: false, points: null });
  }

  const { data: solde } = await adminClient
    .from("points_fidelite_clients")
    .select("points_actuels, points_cumules_total")
    .eq("restaurant_id", restaurantId)
    .eq("client_id", client.id)
    .maybeSingle();

  return NextResponse.json({
    config: config || null,
    inscrit: !!solde,
    points: solde?.points_actuels ?? 0,
    pointsCumules: solde?.points_cumules_total ?? 0,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurantId, action } = body;

    if (!restaurantId || !action) {
      return NextResponse.json({ error: "restaurantId et action requis" }, { status: 400 });
    }

    const supabase = createClient();

    if (action === "rejoindre") {
      const { telephone, nom } = body;
      if (!telephone) {
        return NextResponse.json({ error: "telephone requis" }, { status: 400 });
      }

      // Action publique (visiteur non connecte) : utilise le client admin
      // pour contourner le RLS de maniere controlee, comme pour la
      // creation de comptes personnel.
      const adminClient = createAdminClient();

      let clientId: string;
      const { data: existant } = await adminClient
        .from("clients")
        .select("id")
        .eq("telephone", telephone)
        .maybeSingle();

      if (existant) {
        clientId = existant.id;
        if (nom) await adminClient.from("clients").update({ nom }).eq("id", clientId);
      } else {
        const { data: nouveau, error } = await adminClient
          .from("clients")
          .insert({ telephone, nom: nom || null })
          .select("id")
          .single();
        if (error || !nouveau) {
          return NextResponse.json({ error: "Erreur creation client" }, { status: 500 });
        }
        clientId = nouveau.id;
      }

      const { error: erreurInscription } = await adminClient
        .from("points_fidelite_clients")
        .upsert(
          { restaurant_id: restaurantId, client_id: clientId, points_actuels: 0, points_cumules_total: 0 },
          { onConflict: "restaurant_id,client_id", ignoreDuplicates: true }
        );

      if (erreurInscription) {
        return NextResponse.json({ error: erreurInscription.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === "config") {
      if (!(await verifierAcces(supabase, restaurantId))) {
        return NextResponse.json({ error: "Acces reserve au owner/manager" }, { status: 403 });
      }

      const { pointsParFcfa, seuilRecompense, descriptionRecompense, actif } = body;

      const { error } = await supabase
        .from("programme_fidelite")
        .upsert(
          {
            restaurant_id: restaurantId,
            points_par_fcfa: pointsParFcfa,
            seuil_recompense: seuilRecompense,
            description_recompense: descriptionRecompense,
            actif,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "restaurant_id" }
        );

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "action invalide" }, { status: 400 });
  } catch (error) {
    console.error("Erreur API fidelite:", error);
    return NextResponse.json({ error: "Erreur interne serveur" }, { status: 500 });
  }
}
