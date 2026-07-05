import { getTranslations } from "next-intl/server";
import { requireSuperAdminSession } from "@/lib/auth/require-staff";
import AdminClient from "./AdminClient";

export default async function AdminPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = await params;
  const t = await getTranslations();

  // Protection : /admin est reserve au super_admin plateforme (toi),
  // distinct d'un simple owner de restaurant. Voir
  // src/lib/auth/require-staff.ts (requireSuperAdminSession) et la
  // migration supabase/migrations/0005_super_admin.sql.
  await requireSuperAdminSession(locale);

  return <AdminClient />;
}
