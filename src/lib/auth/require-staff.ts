import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Vérifie qu'un utilisateur est connecté ET rattaché à au moins un
 * restaurant (table utilisateurs_restaurant). Redirige vers /login sinon.
 *
 * À utiliser en haut de toute page serveur staff (dashboard).
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
 * moins un restaurant — utilisé pour les sections /dashboard reservees
 * au proprietaire d'un restaurant (facturation, gestion du staff, etc.),
 * PAS pour /admin (voir requireSuperAdminSession ci-dessous).
 */
export async function requireOwnerSession(locale: string) {
  const { user, acces } = await requireStaffSession(locale);

  const estOwner = acces.some((a) => a.role === "owner");
  if (!estOwner) {
    redirect(`/${locale}/dashboard?error=admin_required`);
  }

  return { user, acces };
}

/**
 * Vérifie qu'un utilisateur est connecté ET est un super_admin plateforme
 * (table super_admins, distincte de utilisateurs_restaurant). Utilisé
 * exclusivement pour /admin — gestion de TOUS les restaurants, tous pays.
 *
 * Un owner de restaurant normal n'a PAS accès à /admin même s'il a
 * role='owner' sur son propre restaurant : ce sont deux notions
 * differentes (owner d'un tenant vs administrateur de la plateforme).
 */
export async function requireSuperAdminSession(locale: string) {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/${locale}/login`);
  }

  const { data: superAdmin, error: superAdminError } = await supabase
    .from("super_admins")
    .select("user_id")
    .eq("user_id", user!.id)
    .maybeSingle();

  if (superAdminError || !superAdmin) {
    redirect(`/${locale}/dashboard?error=super_admin_required`);
  }

  return { user: user! };
}
