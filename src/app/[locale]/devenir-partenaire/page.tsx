"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Store, Users, MapPin, Sparkles } from "lucide-react";
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
    titre: "Votre vitrine en ligne",
    description: "Un lien dedie, votre menu, vos couleurs — visible par des clients qui ne vous connaissaient pas encore.",
  },
  {
    icon: MapPin,
    titre: "Trouve pres de chez vos clients",
    description: "La geolocalisation met en avant votre restaurant aupres des clients a proximite, au bon moment.",
  },
  {
    icon: Users,
    titre: "Fidelisez, pas seulement une fois",
    description: "Programme de fidelite, avis verifies, notifications WhatsApp automatiques : gardez le contact.",
  },
  {
    icon: Sparkles,
    titre: "Reservations et commandes centralisees",
    description: "Reservations, commandes a retirer ou en livraison, caisse — tout au meme endroit, sans jongler entre outils.",
  },
];

export default function DevenirPartenairePage({
  params,
}: {
  params: { locale: string };
}) {
  const t = useTranslations();
  const { locale } = params;
  const navKeys = ["nav_home", "nav_restaurants", "nav_pricing", "nav_dashboard", "nav_admin", "nav_login"];

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

  return (
    <div style={{ minHeight: "100vh", background: "#0B2818", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <AuthNav navKeys={navKeys} locale={locale} activeKey="nav_devenir_partenaire" theme="sombre" />

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 20px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h1
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 34,
              fontWeight: 700,
              color: "#F3EFE4",
              marginBottom: 12,
            }}
          >
            Devenez partenaire AfriTable
          </h1>
          <p style={{ color: "#9BB5A5", fontSize: 16, maxWidth: 600, margin: "0 auto" }}>
            Rejoignez le reseau de restaurants qui gagnent en visibilite et fidelisent leurs clients avec
            AfriTable — sans changer vos habitudes du jour au lendemain.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 20,
            marginBottom: 56,
          }}
        >
          {ARGUMENTS.map((arg) => {
            const Icon = arg.icon;
            return (
              <div
                key={arg.titre}
                style={{
                  background: "#0F3320",
                  borderRadius: 16,
                  padding: "22px 20px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "#412402",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 14,
                  }}
                >
                  <Icon size={18} color="#FAC775" />
                </div>
                <h3 style={{ color: "#F3EFE4", fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                  {arg.titre}
                </h3>
                <p style={{ color: "#9BB5A5", fontSize: 13, lineHeight: 1.5 }}>{arg.description}</p>
              </div>
            );
          })}
        </div>

        <div
          style={{
            background: "#0F3320",
            borderRadius: 20,
            padding: "32px 28px",
            maxWidth: 560,
            margin: "0 auto",
            boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
          }}
        >
          {success ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <p style={{ color: "#97C459", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                Merci ! Votre demande a bien ete recue.
              </p>
              <p style={{ color: "#9BB5A5", fontSize: 14 }}>
                Notre equipe vous contactera tres prochainement pour organiser la mise en place de votre
                restaurant sur AfriTable.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h2 style={{ color: "#F3EFE4", fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
                Parlez-nous de votre restaurant
              </h2>

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
                  padding: "14px 20px",
                  borderRadius: 12,
                  border: "none",
                  background: loading ? "#9BB5A5" : "#F59E0B",
                  color: "#0B2818",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {loading ? "Envoi en cours..." : "Rejoindre AfriTable"}
              </button>
            </form>
          )}
        </div>
      </div>

      <Footer locale={locale} />
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
