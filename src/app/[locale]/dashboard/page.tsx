import { getTranslations } from "next-intl/server";
import { requireStaffSession } from "@/lib/auth/require-staff";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = await params;
  const t = await getTranslations();

  // Protection : redirige vers /login si non connecté ou non rattaché
  // à un restaurant (voir src/lib/auth/require-staff.ts).
  // NOTE : DashboardClient n'accepte pas encore de prop restaurant_id
  // pour filtrer par tenant — TODO Phase 2, voir require-staff.ts.
  await requireStaffSession(locale);

  return <DashboardClient />;
}
