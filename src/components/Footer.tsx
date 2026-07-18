"use client";

import { useTranslations } from "next-intl";
import { Phone, MessageCircle, Facebook, Instagram } from "lucide-react";

/**
 * Numeros de contact et liens reseaux sociaux — a completer/ajuster
 * ici au fur et a mesure que les comptes reels sont crees.
 */
const TELEPHONE_AFFICHE = "01 72 43 45 17";
const TELEPHONE_TEL = "+2250172434517";
const WHATSAPP_NUMERO = "2250172434517";

const RESEAUX_SOCIAUX = {
  facebook: "", // A renseigner une fois le compte cree
  instagram: "", // A renseigner une fois le compte cree
};

export default function Footer({ locale }: { locale: string }) {
  const t = useTranslations();
  const annee = new Date().getFullYear();

  return (
    <footer style={{ background: "#0B2818", padding: "40px 24px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))",
          gap: 32,
          marginBottom: 32,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <img src="/images/logo-afritable.png" alt="AfriTable" style={{ width: 32, height: 32, borderRadius: 8 }} />
              <span style={{ fontWeight: 700, fontSize: 16, color: "#F3EFE4" }}>AfriTable</span>
            </div>
            <p style={{ fontSize: 12.5, color: "#9BB5A5", lineHeight: 1.6, margin: 0 }}>
              {t("footer_accroche")}
            </p>
          </div>

          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#F3EFE4", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 12 }}>
              {t("footer_navigation")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <a href={`/${locale}`} style={{ fontSize: 13, color: "#9BB5A5", textDecoration: "none" }}>{t("nav_home")}</a>
              <a href={`/${locale}/restaurants`} style={{ fontSize: 13, color: "#9BB5A5", textDecoration: "none" }}>{t("nav_restaurants")}</a>
              <a href={`/${locale}/pricing`} style={{ fontSize: 13, color: "#9BB5A5", textDecoration: "none" }}>{t("nav_pricing")}</a>
              <a href={`/${locale}/devenir-partenaire`} style={{ fontSize: 13, color: "#F59E0B", textDecoration: "none", fontWeight: 600 }}>{t("footer_devenir_partenaire")}</a>
              <a href={`/${locale}/pricing`} style={{ fontSize: 13, color: "#F59E0B", textDecoration: "none", fontWeight: 600 }}>{t("hero_cta2")}</a>
            </div>
          </div>

          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#F3EFE4", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 12 }}>
              {t("footer_legal")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <a href={`/${locale}/mentions-legales`} style={{ fontSize: 13, color: "#9BB5A5", textDecoration: "none" }}>{t("footer_mentions_legales")}</a>
              <a href={`/${locale}/cgu`} style={{ fontSize: 13, color: "#9BB5A5", textDecoration: "none" }}>{t("footer_cgu")}</a>
              <a href={`/${locale}/confidentialite`} style={{ fontSize: 13, color: "#9BB5A5", textDecoration: "none" }}>{t("footer_confidentialite")}</a>
            </div>
          </div>

          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#F3EFE4", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 12 }}>
              {t("footer_contact")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a href={`tel:${TELEPHONE_TEL}`} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#9BB5A5", textDecoration: "none" }}>
                <Phone size={15} />
                {TELEPHONE_AFFICHE}
              </a>
              <a href={`https://wa.me/${WHATSAPP_NUMERO}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#9BB5A5", textDecoration: "none" }}>
                <MessageCircle size={15} />
                WhatsApp
              </a>
              <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                {RESEAUX_SOCIAUX.facebook && (
                  <a href={RESEAUX_SOCIAUX.facebook} target="_blank" rel="noopener noreferrer" style={{ color: "#9BB5A5" }}>
                    <Facebook size={17} />
                  </a>
                )}
                {RESEAUX_SOCIAUX.instagram && (
                  <a href={RESEAUX_SOCIAUX.instagram} target="_blank" rel="noopener noreferrer" style={{ color: "#9BB5A5" }}>
                    <Instagram size={17} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid #1D4A31", paddingTop: 16, textAlign: "center" }}>
          <p style={{ fontSize: 11.5, color: "#6E9683", margin: 0 }}>
            © {annee} AfriTable. {t("footer_droits")}
          </p>
        </div>
      </div>
    </footer>
  );
}
