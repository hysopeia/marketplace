import { notFound } from "next/navigation";
import RestaurantDetail from "./RestaurantDetail";

async function getRestaurant(
  slug: string,
  locale: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/restaurants?slug=${slug}&locale=${locale}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function RestaurantPage({
  params,
}: {
  params: { locale: string; pays: string; slug: string };
}) {
  const { locale, slug } = await params;
  const data = await getRestaurant(slug, locale);

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