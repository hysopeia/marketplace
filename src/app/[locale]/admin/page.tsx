import { getTranslations } from "next-intl/server";
import AdminClient from "./AdminClient";

export default async function AdminPage({
  params,
}: {
  params: { locale: string };
}) {
  const t = await getTranslations();

  return <AdminClient />;
}