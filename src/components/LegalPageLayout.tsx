"use client";

import { useTranslations } from "next-intl";
import AuthNav from "@/components/AuthNav";
import Footer from "@/components/Footer";

export default function LegalPageLayout({
  locale,
  titre,
  children,
}: {
  locale: string;
  titre: string;
  children: React.ReactNode;
}) {
  const t = useTranslations();
  const navKeys = ["nav_home", "nav_restaurants", "nav_pricing", "nav_dashboard", "nav_admin", "nav_login"];

  return (
    <div style={{ minHeight: "100vh", background: "#FDF8F0" }}>
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "white", borderBottom: "1px solid #E5E1D8", padding: "0 24px",
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: 64, gap: 12,
        }}>
          <a href={`/${locale}`} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
            <img src="/images/logo-afritable.png" alt="AfriTable" style={{ width: 36, height: 36, borderRadius: 10 }} />
            <span style={{ fontWeight: 700, fontSize: 18, color: "#1F2937" }}>AfriTable</span>
          </a>
          <AuthNav navKeys={navKeys} locale={locale} activeKey="" />
        </div>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 30, fontWeight: 800, color: "#1A1A2E", marginBottom: 24 }}>
          {titre}
        </h1>
        <div style={{ fontSize: 14.5, color: "#374151", lineHeight: 1.8 }}>
          {children}
        </div>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
