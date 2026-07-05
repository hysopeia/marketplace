import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Verifie que l'utilisateur connecte est bien owner du restaurant
 * indique, avant toute operation sensible (inviter/retirer du staff).
 */
async function verifierEstOwnerDuRestaurant(
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
    .eq("role", "owner")
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

  if (!(await verifierEstOwnerDuRestaurant(supabase, restaurantId))) {
    return NextResponse.json({ error: "Acces reserve au proprietaire" }, { status: 403 });
  }

  // Liste des membres du personnel de ce restaurant, avec leur email
  // (recupere via l'API admin, puisque la table utilisateurs_restaurant
  // ne stocke que user_id).
  const { data: membres, error } = await supabase
    .from("utilisateurs_restaurant")
    .select("id, user_id, role, created_at")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const adminClient = createAdminClient();
  const membresAvecEmail = await Promise.all(
    (membres || []).map(async (m) => {
      const { data: userData } = await adminClient.auth.admin.getUserById(m.user_id);
      return { ...m, email: userData?.user?.email || "?" };
    })
  );

  return NextResponse.json({ membres: membresAvecEmail });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurantId, email, role } = body;

    if (!restaurantId || !email || !role) {
      return NextResponse.json(
        { error: "Parametres manquants: restaurantId, email, role" },
        { status: 400 }
      );
    }

    if (!["manager", "staff", "cuisine"].includes(role)) {
      return NextResponse.json(
        { error: "role invalide (manager, staff ou cuisine uniquement)" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    if (!(await verifierEstOwnerDuRestaurant(supabase, restaurantId))) {
      return NextResponse.json({ error: "Acces reserve au proprietaire" }, { status: 403 });
    }

    const adminClient = createAdminClient();

    // Invite l'utilisateur par email : cree le compte et lui envoie un
    // lien pour definir son propre mot de passe (plus sur que de lui
    // communiquer un mot de passe temporaire).
    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email);

    if (inviteError || !inviteData?.user) {
      return NextResponse.json(
        { error: inviteError?.message || "Erreur lors de l'invitation" },
        { status: 500 }
      );
    }

    const { error: liaisonError } = await adminClient
      .from("utilisateurs_restaurant")
      .insert({
        restaurant_id: restaurantId,
        user_id: inviteData.user.id,
        role,
      });

    if (liaisonError) {
      return NextResponse.json({ error: liaisonError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur API staff (POST):", error);
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

  if (!(await verifierEstOwnerDuRestaurant(supabase, restaurantId))) {
    return NextResponse.json({ error: "Acces reserve au proprietaire" }, { status: 403 });
  }

  // Empeche de se retirer soi-meme ou de retirer le dernier owner —
  // securite minimale pour ne pas se retrouver bloque hors de son
  // propre restaurant.
  const { data: ligneAvant } = await supabase
    .from("utilisateurs_restaurant")
    .select("role")
    .eq("id", id)
    .single();

  if (ligneAvant?.role === "owner") {
    return NextResponse.json(
      { error: "Impossible de retirer un proprietaire via cette interface" },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("utilisateurs_restaurant")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
