"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Lock } from "lucide-react";

export default function ResetPasswordPage({
  params,
}: {
  params: { locale: string };
}) {
  const t = useTranslations();
  const router = useRouter();
  const { locale } = params;

  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);
  const [succes, setSucces] = useState(false);
  const [sessionValide, setSessionValide] = useState<boolean | null>(null);

  useEffect(() => {
    // Le lien de l'email cree automatiquement une session de
    // recuperation cote client (@supabase/ssr detecte le token dans
    // l'URL) — on verifie juste qu'elle existe avant d'autoriser le
    // changement de mot de passe.
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionValide(!!session);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");

    if (motDePasse.length < 6) {
      setErreur(t("reset_mdp_trop_court"));
      return;
    }
    if (motDePasse !== confirmation) {
      setErreur(t("reset_mdp_different"));
      return;
    }

    setChargement(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: motDePasse });
    setChargement(false);

    if (error) {
      setErreur(t("erreur_generique"));
      return;
    }

    setSucces(true);
    setTimeout(() => {
      router.push(`/${locale}/dashboard`);
    }, 2000);
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#FDF8F0", padding: 24,
    }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, justifyContent: "center" }}>
          <img src="/images/logo-afritable.png" alt="AfriTable" style={{ width: 40, height: 40, borderRadius: 10 }} />
          <span style={{ fontWeight: 700, fontSize: 18, color: "#1F2937" }}>AfriTable</span>
        </div>

        <div style={{
          background: "white", borderRadius: 16, padding: 32,
          boxShadow: "0 4px 20px rgba(31,41,55,0.08)", border: "1px solid #E5E1D8",
        }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 800, color: "#1A1A2E", marginBottom: 8 }}>
            {t("reset_titre")}
          </h1>

          {sessionValide === false ? (
            <p style={{ fontSize: 14, color: "#B91C1C", marginTop: 16 }}>
              {t("reset_lien_invalide")}
            </p>
          ) : succes ? (
            <div style={{
              padding: "14px 16px", borderRadius: 10, background: "#EAF3DE",
              color: "#3B6D11", fontSize: 14, marginTop: 16,
            }}>
              {t("reset_succes")}
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 24 }}>
                {t("reset_sous_titre")}
              </p>

              {erreur && (
                <p style={{
                  fontSize: 13, color: "#B91C1C", background: "#FEF2F2",
                  padding: "8px 12px", borderRadius: 8, marginBottom: 16,
                }}>
                  {erreur}
                </p>
              )}

              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                {t("reset_nouveau_mdp")}
              </label>
              <div style={{ position: "relative", marginBottom: 16 }}>
                <Lock size={16} color="#9CA3AF" style={{ position: "absolute", left: 12, top: 13 }} />
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 12px 10px 36px", borderRadius: 8,
                    border: "1px solid #E5E1D8", fontSize: 14, outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                {t("reset_confirmer_mdp")}
              </label>
              <div style={{ position: "relative", marginBottom: 24 }}>
                <Lock size={16} color="#9CA3AF" style={{ position: "absolute", left: 12, top: 13 }} />
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 12px 10px 36px", borderRadius: 8,
                    border: "1px solid #E5E1D8", fontSize: 14, outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={chargement || sessionValide === null}
                style={{
                  width: "100%", padding: "12px", borderRadius: 10, border: "none",
                  background: "#F59E0B", color: "white", fontWeight: 600, fontSize: 15,
                  cursor: chargement ? "default" : "pointer", opacity: chargement ? 0.7 : 1,
                }}
              >
                {chargement ? t("loading") : t("reset_valider")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
