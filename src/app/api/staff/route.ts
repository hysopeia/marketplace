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
    .select("id, user_id, role, nom, created_at")
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

/**
 * Genere un mot de passe temporaire simple mais suffisamment robuste,
 * facile a communiquer oralement/par WhatsApp (pas de caracteres
 * ambigus comme 0/O ou 1/l).
 */
function genererMotDePasse(): string {
  const caracteres = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let motDePasse = "";
  for (let i = 0; i < 10; i++) {
    motDePasse += caracteres[Math.floor(Math.random() * caracteres.length)];
  }
  return motDePasse;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurantId, email, role, nom } = body;

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

    // Cree directement le compte avec un mot de passe genere, sans
    // passer par un email d'invitation (plus simple et plus rapide
    // pour le owner : il communique lui-meme le mot de passe au
    // membre de son equipe, par WhatsApp ou oralement).
    const motDePasseGenere = genererMotDePasse();

    const { data: userData, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password: motDePasseGenere,
        email_confirm: true, // pas de mail de confirmation a envoyer
      });

    if (createError || !userData?.user) {
      return NextResponse.json(
        { error: createError?.message || "Erreur lors de la creation du compte" },
        { status: 500 }
      );
    }

    const { error: liaisonError } = await adminClient
      .from("utilisateurs_restaurant")
      .insert({
        restaurant_id: restaurantId,
        user_id: userData.user.id,
        role,
        nom: nom || null,
      });

    if (liaisonError) {
      return NextResponse.json({ error: liaisonError.message }, { status: 500 });
    }

    // Le mot de passe n'est retourne qu'une seule fois ici — il n'est
    // jamais stocke en clair, le owner doit le communiquer maintenant.
    return NextResponse.json({ success: true, motDePasse: motDePasseGenere, email });
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

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, restaurantId, role, nom } = body;

    if (!id || !restaurantId || (!role && nom === undefined)) {
      return NextResponse.json({ error: "id, restaurantId et (role ou nom) requis" }, { status: 400 });
    }

    const supabase = createClient();

    if (!(await verifierEstOwnerDuRestaurant(supabase, restaurantId))) {
      return NextResponse.json({ error: "Acces reserve au proprietaire" }, { status: 403 });
    }

    const adminClient = createAdminClient();

    // Modification du nom seul: autorisee pour n'importe quel membre,
    // y compris le proprietaire lui-meme (contrairement au role, ce
    // n'est pas une question de privilege).
    if (nom !== undefined && !role) {
      const { error: erreurNom } = await adminClient
        .from("utilisateurs_restaurant")
        .update({ nom: nom || null })
        .eq("id", id)
        .eq("restaurant_id", restaurantId);

      if (erreurNom) {
        return NextResponse.json({ error: erreurNom.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (!["manager", "staff", "cuisine"].includes(role)) {
      return NextResponse.json(
        { error: "role invalide (manager, staff ou cuisine uniquement)" },
        { status: 400 }
      );
    }

    // Empeche de retirer/retrograder le dernier owner via cette route
    // (protection deja appliquee a la suppression, meme logique ici).
    const { data: ligneAvant } = await supabase
      .from("utilisateurs_restaurant")
      .select("role")
      .eq("id", id)
      .single();

    if (ligneAvant?.role === "owner") {
      return NextResponse.json(
        { error: "Impossible de modifier le role d'un proprietaire via cette interface" },
        { status: 400 }
      );
    }

    const miseAJour: Record<string, unknown> = { role };
    if (nom !== undefined) miseAJour.nom = nom || null;

    const { error } = await adminClient
      .from("utilisateurs_restaurant")
      .update(miseAJour)
      .eq("id", id)
      .eq("restaurant_id", restaurantId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur interne serveur" }, { status: 500 });
  }
}
