import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase utilisant la cle service_role — contourne le RLS,
 * permet de creer des comptes utilisateurs (auth.admin.*).
 *
 * ATTENTION : ce fichier ne doit JAMAIS etre importe dans un composant
 * client ("use client") ni expose au navigateur. Uniquement dans des
 * API routes (src/app/api/.../route.ts), execute cote serveur.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
