"use client";

import { usePathname, useRouter } from "next/navigation";

const LANGUES = [
  { code: "fr", label: "FR" },
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
  { code: "pt", label: "PT" },
];

/**
 * Selecteur de langue : remplace le segment de locale dans le chemin
 * actuel (/fr/restaurants -> /en/restaurants) sans perdre la page en cours.
 */
export default function LanguageSwitcher({ locale }: { locale: string }) {
  const pathname = usePathname();
  const router = useRouter();

  function changerLangue(nouvelleLangue: string) {
    const segments = pathname.split("/");
    segments[1] = nouvelleLangue;
    router.push(segments.join("/"));
  }

  return (
    <select
      value={locale}
      onChange={(e) => changerLangue(e.target.value)}
      aria-label="Choisir la langue"
      style={{
        padding: "6px 10px",
        borderRadius: 8,
        border: "1px solid #E5E1D8",
        background: "white",
        fontSize: 13,
        fontWeight: 500,
        color: "#3A2E22",
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {LANGUES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}
