import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Enregistre une prise ou fin de service pour l'utilisateur connecte
// (l'identite vient de la session, jamais du corps de la requete —
// impossible de pointer pour quelqu'un d'autre).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurantId, type } = body;

    if (!restaurantId || !["entree", "sortie"].includes(type)) {
      return NextResponse.json({ error: "restaurantId et type ('entree'|'sortie') requis" }, { status: 400 });
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non connecte" }, { status: 401 });
    }

    const { data: acces } = await supabase
      .from("utilisateurs_restaurant")
      .select("role")
      .eq("user_id", user.id)
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (!acces) {
      return NextResponse.json({ error: "Acces reserve au personnel du restaurant" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("pointages")
      .insert({ restaurant_id: restaurantId, user_id: user.id, type })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, pointage: data });
  } catch (error) {
    console.error("Erreur POST pointage:", error);
    return NextResponse.json({ error: "Erreur interne serveur" }, { status: 500 });
  }
}

// Retourne le dernier pointage de l'utilisateur connecte (pour savoir
// s'il est actuellement "en service"), et — uniquement pour un
// owner/manager — l'historique recent de toute l'equipe avec les
// emails (via l'API admin, comme pour la liste d'equipe existante).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId");

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId requis" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non connecte" }, { status: 401 });
  }

  const { data: acces } = await supabase
    .from("utilisateurs_restaurant")
    .select("role")
    .eq("user_id", user.id)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (!acces) {
    return NextResponse.json({ error: "Acces reserve au personnel du restaurant" }, { status: 403 });
  }

  const { data: dernierPointage } = await supabase
    .from("pointages")
    .select("type, created_at")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let historique: { id: string; email: string; type: string; created_at: string }[] = [];
  let enService: { email: string; depuis: string }[] = [];

  if (acces.role === "owner" || acces.role === "manager") {
    const { data: pointages } = await supabase
      .from("pointages")
      .select("id, user_id, type, created_at")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (pointages && pointages.length > 0) {
      const adminClient = createAdminClient();
      const userIdsUniques = Array.from(new Set(pointages.map((p) => p.user_id)));
      const emailsParId: Record<string, string> = {};
      await Promise.all(
        userIdsUniques.map(async (uid) => {
          const { data: userData } = await adminClient.auth.admin.getUserById(uid);
          emailsParId[uid] = userData?.user?.email || "?";
        })
      );

      historique = pointages.map((p) => ({
        id: p.id,
        email: emailsParId[p.user_id] || "?",
        type: p.type,
        created_at: p.created_at,
      }));

      // "pointages" est deja trie du plus recent au plus ancien — le
      // premier pointage rencontre pour un user_id donne est donc son
      // dernier. S'il s'agit d'une "entree", cette personne est
      // actuellement en service.
      const dernierParUser: Record<string, { type: string; created_at: string }> = {};
      for (const p of pointages) {
        if (!dernierParUser[p.user_id]) {
          dernierParUser[p.user_id] = { type: p.type, created_at: p.created_at };
        }
      }
      enService = Object.entries(dernierParUser)
        .filter(([, v]) => v.type === "entree")
        .map(([uid, v]) => ({ email: emailsParId[uid] || "?", depuis: v.created_at }));
    }
  }

  return NextResponse.json({
    dernierType: dernierPointage?.type || null,
    dernierPointageA: dernierPointage?.created_at || null,
    historique,
    enService,
  });
}
