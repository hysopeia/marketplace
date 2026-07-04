import { getTranslations } from "next-intl/server";
import { requireOwnerSession } from "@/lib/auth/require-staff";
import AdminClient from "./AdminClient";

export default async function AdminPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = await params;
  const t = await getTranslations();

  // Protection : redirige vers /login (ou /dashboard si connecté mais
  // pas owner) — voir src/lib/auth/require-staff.ts.
  // NOTE : AdminClient n'accepte pas encore de prop restaurant_id
  // pour filtrer par tenant — TODO Phase 2, voir require-staff.ts.
  await requireOwnerSession(locale);

  return <AdminClient />;
}
