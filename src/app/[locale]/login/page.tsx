"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, ArrowLeft } from "lucide-react";

export default function LoginPage({
  params,
}: {
  params: { locale: string };
}) {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = params;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modeMotDePasseOublie, setModeMotDePasseOublie] = useState(false);
  const [emailRecuperation, setEmailRecuperation] = useState("");
  const [recuperationEnvoyee, setRecuperationEnvoyee] = useState(false);
  const [erreurRecuperation, setErreurRecuperation] = useState("");
  const [chargementRecuperation, setChargementRecuperation] = useState(false);

  // Personnalisation par restaurant : /login?resto=mon-resto-pilote
  // affiche le nom/logo du restaurant plutot que la marque generique
  // AfriTable, utile pour un lien de connexion partage directement
  // au personnel d'un restaurant precis.
  const restoSlug = searchParams.get("resto");
  const [restoInfo, setRestoInfo] = useState<{ nom: string; logo_url: string | null } | null>(null);

  useEffect(() => {
    if (!restoSlug) return;
    fetch(`/api/restaurants?slug=${restoSlug}&locale=${locale}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.restaurant) {
          setRestoInfo({ nom: data.restaurant.nom, logo_url: data.restaurant.logo_url });
        }
      })
      .catch(() => {});
  }, [restoSlug, locale]);

  const errorParam = searchParams.get("error");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(t("login_error"));
      return;
    }

    router.push(`/${locale}/dashboard`);
    router.refresh();
  }

  async function handleEnvoyerRecuperation(e: React.FormEvent) {
    e.preventDefault();
    setErreurRecuperation("");

    if (!emailRecuperation) {
      setErreurRecuperation(t("champs_requis"));
      return;
    }

    setChargementRecuperation(true);
    const supabase = createClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";

    const { error: recupError } = await supabase.auth.resetPasswordForEmail(
      emailRecuperation,
      { redirectTo: `${origin}/${locale}/reset-password` }
    );

    setChargementRecuperation(false);

    // On affiche toujours le meme message de succes, meme si l'email
    // n'existe pas en base — evite de reveler quels emails sont
    // enregistres (bonne pratique de securite classique).
    if (!recupError) {
      setRecuperationEnvoyee(true);
    } else {
      setErreurRecuperation(t("erreur_generique"));
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#FDF8F0" }}>
      {/* Panneau visuel - generique ou personnalise par restaurant */}
      <div
        style={{
          flex: 1,
          display: "none",
          position: "relative",
          overflow: "hidden",
        }}
        className="login-panel-visuel"
      >
        <img
          src={restoInfo?.logo_url || "/images/hero-patron.jpg"}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, rgba(245,158,11,0.55) 0%, rgba(31,41,55,0.75) 100%)",
            display: "flex",
            alignItems: "flex-end",
            padding: 48,
          }}
        >
          <div>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginBottom: 8 }}>
              {restoInfo ? t("login_espace_de") : "AfriTable"}
            </p>
            <h2 style={{
              fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 800,
              color: "white", margin: 0, maxWidth: 380,
            }}>
              {restoInfo ? restoInfo.nom : t("login_visuel_titre")}
            </h2>
          </div>
        </div>
      </div>

      {/* Panneau formulaire */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ width: "100%", maxWidth: 380 }}>
          <a
            href={`/${locale}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 13, color: "#6B7280", textDecoration: "none",
              marginBottom: 24,
            }}
          >
            <ArrowLeft size={14} />
            {t("retour_accueil")}
          </a>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <img src="/images/logo-afritable.png" alt="AfriTable" style={{ width: 40, height: 40, borderRadius: 10 }} />
            <span style={{ fontWeight: 700, fontSize: 18, color: "#1F2937" }}>AfriTable</span>
          </div>

          {modeMotDePasseOublie ? (
            <form
              onSubmit={handleEnvoyerRecuperation}
              style={{
                width: "100%",
                background: "white",
                borderRadius: 16,
                padding: 32,
                boxShadow: "0 4px 20px rgba(31,41,55,0.08)",
                border: "1px solid #E5E1D8",
                boxSizing: "border-box",
              }}
            >
              <h1
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#1A1A2E",
                  marginBottom: 8,
                }}
              >
                {t("login_mdp_oublie_titre")}
              </h1>

              {recuperationEnvoyee ? (
                <div style={{
                  padding: "14px 16px", borderRadius: 10, background: "#EAF3DE",
                  color: "#3B6D11", fontSize: 14, marginTop: 16,
                }}>
                  {t("login_mdp_oublie_envoye")}
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 24 }}>
                    {t("login_mdp_oublie_sous_titre")}
                  </p>

                  {erreurRecuperation && (
                    <p style={{
                      fontSize: 13, color: "#B91C1C", background: "#FEF2F2",
                      padding: "8px 12px", borderRadius: 8, marginBottom: 16,
                    }}>
                      {erreurRecuperation}
                    </p>
                  )}

                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Email
                  </label>
                  <div style={{ position: "relative", marginBottom: 20 }}>
                    <Mail size={16} color="#9CA3AF" style={{ position: "absolute", left: 12, top: 13 }} />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={emailRecuperation}
                      onChange={(e) => setEmailRecuperation(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px 10px 36px",
                        borderRadius: 8,
                        border: "1px solid #E5E1D8",
                        fontSize: 14,
                        outline: "none",
                        boxSizing: "border-box",
                        boxShadow: "inset 0 1px 2px rgba(31,41,55,0.04)",
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={chargementRecuperation}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: 10,
                      border: "none",
                      background: "#F59E0B",
                      color: "white",
                      fontWeight: 600,
                      fontSize: 15,
                      cursor: chargementRecuperation ? "default" : "pointer",
                      opacity: chargementRecuperation ? 0.7 : 1,
                      marginBottom: 16,
                    }}
                  >
                    {chargementRecuperation ? t("loading") : t("login_mdp_oublie_envoyer")}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  setModeMotDePasseOublie(false);
                  setRecuperationEnvoyee(false);
                  setErreurRecuperation("");
                }}
                style={{
                  width: "100%", background: "none", border: "none",
                  color: "#6B7280", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {t("login_retour_connexion")}
              </button>
            </form>
          ) : (
          <form
            onSubmit={handleSubmit}
            suppressHydrationWarning
            style={{
              width: "100%",
              background: "white",
              borderRadius: 16,
              padding: 32,
              boxShadow: "0 4px 20px rgba(31,41,55,0.08)",
              border: "1px solid #E5E1D8",
            }}
          >
            <h1
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 24,
                fontWeight: 800,
                color: "#1A1A2E",
                marginBottom: 8,
              }}
            >
              {restoInfo ? `${t("login_title")} — ${restoInfo.nom}` : t("login_title")}
            </h1>
            <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 24 }}>
              {t("login_subtitle")}
            </p>

            {errorParam === "no_access" && (
              <p style={{
                fontSize: 13, color: "#B91C1C", background: "#FEF2F2",
                padding: "8px 12px", borderRadius: 8, marginBottom: 16,
              }}>
                {t("login_no_access")}
              </p>
            )}
            {errorParam === "admin_required" && (
              <p style={{
                fontSize: 13, color: "#B91C1C", background: "#FEF2F2",
                padding: "8px 12px", borderRadius: 8, marginBottom: 16,
              }}>
                {t("login_admin_required")}
              </p>
            )}
            {error && (
              <p style={{
                fontSize: 13, color: "#B91C1C", background: "#FEF2F2",
                padding: "8px 12px", borderRadius: 8, marginBottom: 16,
              }}>
                {error}
              </p>
            )}

            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Email
            </label>
            <div style={{ position: "relative", marginBottom: 16 }}>
              <Mail size={16} color="#9CA3AF" style={{ position: "absolute", left: 12, top: 13 }} />
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 36px",
                  borderRadius: 8,
                  border: "1px solid #E5E1D8",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  boxShadow: "inset 0 1px 2px rgba(31,41,55,0.04)",
                }}
              />
            </div>

            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              {t("login_password")}
            </label>
            <div style={{ position: "relative", marginBottom: 24 }}>
              <Lock size={16} color="#9CA3AF" style={{ position: "absolute", left: 12, top: 13 }} />
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 36px",
                  borderRadius: 8,
                  border: "1px solid #E5E1D8",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  boxShadow: "inset 0 1px 2px rgba(31,41,55,0.04)",
                }}
              />
            </div>

            <button
              type="button"
              onClick={() => setModeMotDePasseOublie(true)}
              style={{
                display: "block", marginBottom: 16, background: "none", border: "none",
                color: "#F59E0B", fontSize: 13, cursor: "pointer", fontFamily: "inherit", padding: 0,
              }}
            >
              {t("login_mdp_oublie_lien")}
            </button>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 10,
                border: "none",
                background: "#F59E0B",
                color: "white",
                fontWeight: 600,
                fontSize: 15,
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.7 : 1,
                boxShadow: loading ? "none" : "0 4px 12px rgba(245,158,11,0.3)",
                transition: "all 0.15s",
              }}
            >
              {loading ? t("loading") : t("login_submit")}
            </button>
          </form>
          )}
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .login-panel-visuel {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
