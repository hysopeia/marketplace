"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function getNavHref(key: string, locale: string): string {
  if (key === "nav_home") return `/${locale}`;
  if (key === "nav_restaurants") return `/${locale}/restaurants`;
  if (key === "nav_pricing") return `/${locale}/pricing`;
  if (key === "nav_dashboard") return `/${locale}/dashboard`;
  if (key === "nav_admin") return `/${locale}/admin`;
  if (key === "nav_login") return `/${locale}/login`;
  return `/${locale}`;
}

/**
 * Menu de navigation partage par toutes les pages publiques.
 * Masque "Tableau de bord"/"Administration" pour un visiteur non
 * connecte (ce sont des liens vers des pages protegees, ca n'a pas
 * de sens de les montrer a tout le monde), et remplace "Connexion"
 * par un vrai bouton "Deconnexion" une fois authentifie.
 */
export default function AuthNav({
  navKeys,
  locale,
  activeKey,
}: {
  navKeys: string[];
  locale: string;
  activeKey: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [connecte, setConnecte] = useState(false);
  const [estSuperAdmin, setEstSuperAdmin] = useState(false);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    async function verifierSession() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setChargement(false);
        return;
      }

      setConnecte(true);

      const { data: superAdmin } = await supabase
        .from("super_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      setEstSuperAdmin(!!superAdmin);
      setChargement(false);
    }
    verifierSession();
  }, []);

  async function handleDeconnexion() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${locale}`);
    router.refresh();
  }

  if (chargement) return null;

  const keysAffiches = navKeys.filter((key) => {
    if (key === "nav_dashboard") return connecte;
    if (key === "nav_admin") return connecte && estSuperAdmin;
    if (key === "nav_login") return true; // gere separement ci-dessous
    return true;
  });

  return (
    <nav style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {keysAffiches.map((key) => {
        if (key === "nav_login") {
          if (connecte) {
            return (
              <button
                key={key}
                onClick={handleDeconnexion}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#6B7280",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {t("nav_logout")}
              </button>
            );
          }
        }

        return (
          <a
            key={key}
            href={getNavHref(key, locale)}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 500,
              color: key === activeKey ? "#C75B39" : "#6B7280",
              background: key === activeKey ? "rgba(199,91,57,0.08)" : "transparent",
              textDecoration: "none",
            }}
          >
            {t(key)}
          </a>
        );
      })}
    </nav>
  );
}
