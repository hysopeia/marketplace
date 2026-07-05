import { getTranslations } from "next-intl/server";
import { requireStaffSession } from "@/lib/auth/require-staff";
import DashboardClient from "./DashboardClient";

/**
 * Determine le role a utiliser pour le rendu du dashboard.
 * owner > manager > staff sont hierarchiques (le plus permissif gagne).
 * 'cuisine' est different : c'est un role LATERAL (pas "moins bien" que
 * staff, juste une fonction differente) donc on ne le retourne que si
 * l'utilisateur n'a QUE ce role — sinon un manager qui est aussi
 * assigne cuisine garde sa vue manager complete.
 */
function determinerRolePrincipal(acces: { restaurant_id: string; role: string }[]): string {
  if (acces.some((a) => a.role === "owner")) return "owner";
  if (acces.some((a) => a.role === "manager")) return "manager";
  if (acces.some((a) => a.role === "staff")) return "staff";
  if (acces.some((a) => a.role === "cuisine")) return "cuisine";
  return "staff";
}

export default async function DashboardPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = await params;
  const t = await getTranslations();

  // Protection : redirige vers /login si non connecté ou non rattaché
  // à un restaurant (voir src/lib/auth/require-staff.ts).
  const { acces } = await requireStaffSession(locale);
  const role = determinerRolePrincipal(acces);

  return <DashboardClient role={role} />;
}
