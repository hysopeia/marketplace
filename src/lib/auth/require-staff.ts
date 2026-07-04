import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Vérifie qu'un utilisateur est connecté ET rattaché à au moins un
 * restaurant (table utilisateurs_restaurant). Redirige vers /login sinon.
 *
 * À utiliser en haut de toute page serveur staff (dashboard, admin).
 *
 * LIMITATION CONNUE (MVP) : ceci protège l'accès staff/owner par restaurant,
 * mais ne distingue pas encore un "super_admin" plateforme (toi) d'un
 * simple "owner" de restaurant. Pour la Phase 2 (multi-tenant réel),
 * ajouter un champ role au niveau utilisateur global (ex: via
 * auth.users.app_metadata.role = 'super_admin') avant d'ouvrir /admin
 * à des tiers.
 */
export async function requireStaffSession(locale: string) {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/${locale}/login`);
  }

  const { data: acces, error: accesError } = await supabase
    .from("utilisateurs_restaurant")
    .select("restaurant_id, role")
    .eq("user_id", user!.id);

  if (accesError || !acces || acces.length === 0) {
    redirect(`/${locale}/login?error=no_access`);
  }

  return { user: user!, acces: acces! };
}

/**
 * Comme requireStaffSession, mais exige en plus un rôle 'owner' sur au
 * moins un restaurant — utilisé pour /admin.
 */
export async function requireOwnerSession(locale: string) {
  const { user, acces } = await requireStaffSession(locale);

  const estOwner = acces.some((a) => a.role === "owner");
  if (!estOwner) {
    redirect(`/${locale}/dashboard?error=admin_required`);
  }

  return { user, acces };
}