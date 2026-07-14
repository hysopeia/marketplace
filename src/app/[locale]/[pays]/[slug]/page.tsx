import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import RestaurantDetail from "./RestaurantDetail";

async function getRestaurant(
  slug: string,
  locale: string,
  apercu: boolean
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = `${baseUrl}/api/restaurants?slug=${slug}&locale=${locale}${apercu ? "&apercu=1" : ""}`;

  // Necessaire pour que le mode apercu (admin/owner non actif) puisse
  // verifier l'identite de la personne connectee cote API — un fetch
  // serveur-a-serveur ne transmet pas les cookies automatiquement.
  const entetes: Record<string, string> = {};
  if (apercu) {
    const cookieStore = await cookies();
    entetes.Cookie = cookieStore.toString();
  }

  const res = await fetch(url, {
    cache: "no-store",
    headers: entetes,
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function RestaurantPage({
  params,
  searchParams,
}: {
  params: { locale: string; pays: string; slug: string };
  searchParams: { apercu?: string };
}) {
  const { locale, slug } = await params;
  const { apercu } = await searchParams;
  const data = await getRestaurant(slug, locale, apercu === "1");

  if (!data) {
    notFound();
  }

  return (
    <RestaurantDetail
      restaurant={data.restaurant}
      menu={data.menu}
      creneaux={data.creneaux}
      locale={locale}
    />
  );
}