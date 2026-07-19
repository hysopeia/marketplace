"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Store, Users, MapPin, Sparkles, Check, ArrowRight } from "lucide-react";
import AuthNav from "@/components/AuthNav";
import Footer from "@/components/Footer";

const PAYS_OPTIONS = [
  { code: "CI", nom: "Cote d'Ivoire" },
  { code: "SN", nom: "Senegal" },
  { code: "ML", nom: "Mali" },
  { code: "CM", nom: "Cameroun" },
  { code: "BF", nom: "Burkina Faso" },
  { code: "BJ", nom: "Benin" },
  { code: "TG", nom: "Togo" },
  { code: "NE", nom: "Niger" },
  { code: "GN", nom: "Guinee" },
];

const ARGUMENTS = [
  {
    icon: Store,
    titre: "Votre vitrine digitale",
    description: "Un lien dedie, votre menu, vos couleurs — visible par des clients qui ne vous connaissaient pas encore.",
    accent: "#0F8B4C",
  },
  {
    icon: MapPin,
    titre: "Trouve pres de vos clients",
    description: "La geolocalisation met en avant votre restaurant aupres des clients a proximite, au bon moment.",
    accent: "#115A3D",
  },
  {
    icon: Users,
    titre: "Fidelisez, pas seulement une fois",
    description: "Programme de fidelite, avis verifies, notifications WhatsApp automatiques : gardez le contact.",
    accent: "#0B3F2A",
  },
  {
    icon: Sparkles,
    titre: "Tout centralise",
    description: "Reservations, commandes a retirer ou en livraison, caisse — sans jongler entre outils.",
    accent: "#0F8B4C",
  },
];

type StatsPubliques = {
  totalRestaurants: number;
  satisfaction: number | null;
  totalAvis: number;
  totalCommandes: number;
};

export default function DevenirPartenairePage({
  params,
}: {
  params: { locale: string };
}) {
  const t = useTranslations();
  const { locale } = params;
  const navKeys = ["nav_home", "nav_restaurants", "nav_pricing", "nav_dashboard", "nav_admin", "nav_login"];
  const formRef = useRef<HTMLDivElement>(null);

  const [nomRestaurant, setNomRestaurant] = useState("");
  const [nomContact, setNomContact] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [ville, setVille] = useState("");
  const [pays, setPays] = useState("CI");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<StatsPubliques | null>(null);

  useEffect(() => {
    fetch("/api/stats/publiques")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setStats(data))
      .catch(() => {});
  }, []);

  function scrollVersFormulaire() {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!nomRestaurant || !nomContact || !telephone) {
      setError("Le nom du restaurant, votre nom et votre telephone sont obligatoires.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/partenariat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomRestaurant,
          nomContact,
          telephone,
          email: email || undefined,
          ville: ville || undefined,
          pays,
          message: message || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Une erreur est survenue. Reessayez.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch {
      setError("Une erreur est survenue. Reessayez.");
      setLoading(false);
    }
  }

  const statsAffichees = [
    stats && stats.totalRestaurants > 0
      ? { valeur: `${stats.totalRestaurants}`, label: `restaurant${stats.totalRestaurants > 1 ? "s" : ""} deja inscrit${stats.totalRestaurants > 1 ? "s" : ""}` }
      : null,
    stats && stats.totalCommandes > 0
      ? { valeur: `${stats.totalCommandes.toLocaleString("fr-FR")}`, label: `commande${stats.totalCommandes > 1 ? "s" : ""} traitee${stats.totalCommandes > 1 ? "s" : ""}` }
      : null,
    stats && stats.satisfaction != null && stats.totalAvis >= 3
      ? { valeur: `${stats.satisfaction}%`, label: "de clients satisfaits" }
      : null,
  ].filter(Boolean) as { valeur: string; label: string }[];

  return (
    <div style={{ minHeight: "100vh", background: "#0B2818", fontFamily: "system-ui, -apple-system, sans-serif", position: "relative", overflow: "hidden" }}>
      {/* Formes floues decoratives en fond, style Linear/Stripe */}
      <div style={{
        position: "absolute", top: -120, right: -100, width: 420, height: 420, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(245,158,11,0.16) 0%, rgba(245,158,11,0) 70%)",
        filter: "blur(10px)", pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", top: 280, left: -160, width: 480, height: 480, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(15,139,76,0.22) 0%, rgba(15,139,76,0) 70%)",
        filter: "blur(10px)", pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", top: 900, right: -140, width: 380, height: 380, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(245,158,11,0.10) 0%, rgba(245,158,11,0) 70%)",
        filter: "blur(10px)", pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <AuthNav navKeys={navKeys} locale={locale} activeKey="nav_devenir_partenaire" theme="sombre" />

        {/* Hero */}
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "72px 20px 40px", textAlign: "center" }}>
          <span style={{
            display: "inline-block", padding: "6px 16px", borderRadius: 20,
            background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)",
            color: "#FAC775", fontSize: 12.5, fontWeight: 700, letterSpacing: 0.5,
            textTransform: "uppercase", marginBottom: 20,
          }}>
            Partenariat restaurateurs
          </span>
          <h1 style={{
            fontFamily: "Georgia, serif", fontSize: "clamp(30px, 5vw, 46px)", fontWeight: 700,
            color: "#F3EFE4", marginBottom: 18, lineHeight: 1.15,
          }}>
            Devenez partenaire AfriTable
          </h1>
          <p style={{ color: "#9BB5A5", fontSize: 17, maxWidth: 620, margin: "0 auto 28px", lineHeight: 1.6 }}>
            Le meilleur moyen de developper votre restaurant — plus de visibilite, plus de commandes,
            plus de clients fideles, sans changer vos habitudes du jour au lendemain.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 20px", marginBottom: 32 }}>
            {["Plus de visibilite", "Plus de commandes", "Plus de clients fideles"].map((txt) => (
              <span key={txt} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#D9E8DF", fontSize: 14 }}>
                <Check size={15} color="#0F8B4C" />
                {txt}
              </span>
            ))}
          </div>

          <button
            onClick={scrollVersFormulaire}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "15px 30px", borderRadius: 14, border: "none",
              background: "#F59E0B", color: "#1F2410", fontWeight: 700, fontSize: 15.5,
              cursor: "pointer", fontFamily: "inherit",
              boxShadow: "0 8px 24px rgba(245,158,11,0.25)",
            }}
          >
            Demander a rejoindre AfriTable
            <ArrowRight size={17} />
          </button>
        </div>

        {/* Preuve sociale - uniquement des chiffres reels de la plateforme */}
        {statsAffichees.length > 0 && (
          <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 56px" }}>
            <div style={{
              display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "24px 56px",
              padding: "24px 32px", borderRadius: 18,
              background: "rgba(15,51,32,0.6)", border: "1px solid #1D4A31",
            }}>
              {statsAffichees.map((s) => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <p style={{ fontFamily: "Georgia, serif", fontSize: 30, fontWeight: 700, color: "#F3EFE4", margin: 0 }}>
                    {s.valeur}
                  </p>
                  <p style={{ color: "#9BB5A5", fontSize: 13, margin: "2px 0 0" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 20px 80px" }}>
          {/* Cartes arguments */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 20,
              marginBottom: 64,
            }}
          >
            {ARGUMENTS.map((arg) => {
              const Icon = arg.icon;
              return (
                <div
                  key={arg.titre}
                  className="carte-argument"
                  style={{
                    background: arg.accent,
                    borderRadius: 18,
                    padding: "26px 22px",
                    boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 14,
                      background: "rgba(255,255,255,0.14)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 18,
                    }}
                  >
                    <Icon size={26} color="#FAC775" />
                  </div>
                  <h3 style={{ color: "#F3EFE4", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                    {arg.titre}
                  </h3>
                  <p style={{ color: "rgba(243,239,228,0.75)", fontSize: 13.5, lineHeight: 1.55 }}>{arg.description}</p>
                </div>
              );
            })}
          </div>

          {/* Formulaire */}
          <div ref={formRef} style={{ scrollMarginTop: 96 }}>
            <div
              style={{
                background: "#0F3320",
                borderRadius: 22,
                padding: "36px 32px",
                maxWidth: 560,
                margin: "0 auto",
                boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
                border: "1px solid #1D4A31",
              }}
            >
              {success ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div className="cercle-succes" style={{
                    width: 64, height: 64, borderRadius: "50%",
                    background: "rgba(15,139,76,0.15)", border: "2px solid #0F8B4C",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 20px",
                  }}>
                    <Check size={28} color="#0F8B4C" />
                  </div>
                  <p style={{ color: "#F3EFE4", fontSize: 19, fontWeight: 700, marginBottom: 10 }}>
                    Votre demande est enregistree
                  </p>
                  <p style={{ color: "#9BB5A5", fontSize: 14, lineHeight: 1.6 }}>
                    Notre equipe vous contactera tres prochainement pour organiser la mise en place de
                    votre restaurant sur AfriTable.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <h2 style={{ color: "#F3EFE4", fontSize: 19, fontWeight: 700, marginBottom: 4 }}>
                    Parlez-nous de votre restaurant
                  </h2>
                  <p style={{ color: "#9BB5A5", fontSize: 13, marginBottom: 22 }}>
                    Deux minutes suffisent — on s'occupe du reste.
                  </p>

                  <div style={{ display: "grid", gap: 16 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#F3EFE4", marginBottom: 6 }}>
                        Nom du restaurant *
                      </label>
                      <input
                        type="text"
                        value={nomRestaurant}
                        onChange={(e) => setNomRestaurant(e.target.value)}
                        style={inputStyle}
                        placeholder="Chez Awa"
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#F3EFE4", marginBottom: 6 }}>
                          Votre nom *
                        </label>
                        <input
                          type="text"
                          value={nomContact}
                          onChange={(e) => setNomContact(e.target.value)}
                          style={inputStyle}
                          placeholder="Awa Kone"
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#F3EFE4", marginBottom: 6 }}>
                          Telephone *
                        </label>
                        <input
                          type="text"
                          value={telephone}
                          onChange={(e) => setTelephone(e.target.value)}
                          style={inputStyle}
                          placeholder="+22507070707"
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#F3EFE4", marginBottom: 6 }}>
                          Email
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          style={inputStyle}
                          placeholder="awa@exemple.com"
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#F3EFE4", marginBottom: 6 }}>
                          Ville
                        </label>
                        <input
                          type="text"
                          value={ville}
                          onChange={(e) => setVille(e.target.value)}
                          style={inputStyle}
                          placeholder="Abidjan"
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#F3EFE4", marginBottom: 6 }}>
                        Pays
                      </label>
                      <select value={pays} onChange={(e) => setPays(e.target.value)} style={inputStyle}>
                        {PAYS_OPTIONS.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.nom}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#F3EFE4", marginBottom: 6 }}>
                        Message (facultatif)
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        style={{ ...inputStyle, minHeight: 80, resize: "vertical" as const }}
                        placeholder="Type de restaurant, nombre de tables, besoins particuliers..."
                      />
                    </div>
                  </div>

                  {error && (
                    <p style={{ color: "#F87171", fontSize: 13, marginTop: 14 }}>{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      marginTop: 22,
                      width: "100%",
                      padding: "15px 20px",
                      borderRadius: 12,
                      border: "none",
                      background: loading ? "#9BB5A5" : "#F59E0B",
                      color: "#1F2410",
                      fontWeight: 700,
                      fontSize: 15,
                      cursor: loading ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                      boxShadow: loading ? "none" : "0 8px 20px rgba(245,158,11,0.22)",
                    }}
                  >
                    {loading ? "Envoi en cours..." : "Rejoindre AfriTable"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        <Footer locale={locale} />
      </div>

      <style jsx>{`
        .carte-argument:hover {
          transform: translateY(-4px);
          box-shadow: 0 14px 32px rgba(0, 0, 0, 0.28) !important;
        }
        .cercle-succes {
          animation: apparition-douce 0.5s ease;
        }
        @keyframes apparition-douce {
          from {
            opacity: 0;
            transform: scale(0.7);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "2px solid #1D4A31",
  borderRadius: 10,
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
  background: "#0B2818",
  color: "#F3EFE4",
};
