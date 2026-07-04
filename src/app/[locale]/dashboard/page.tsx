import { getTranslations } from "next-intl/server";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage({
  params,
}: {
  params: { locale: string };
}) {
  const t = await getTranslations();

  return <DashboardClient />;
}