"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2, Eye, EyeOff, Megaphone, Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const TAILLE_MAX_OCTETS = 5 * 1024 * 1024; // 5 Mo, aligne sur la limite du bucket Supabase

type Annonce = {
  id: string;
  titre: string;
  description: string | null;
  image_url: string | null;
  date_debut: string | null;
  date_fin: string | null;
  actif: boolean;
  likes_count: number;
  created_at: string;
};

export default function Annonces({ restaurantId }: { restaurantId: string }) {
  const t = useTranslations();
  const supabase = createClient();

  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [chargement, setChargement] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  const charger = useCallback(async () => {
    try {
      const res = await fetch(`/api/annonces?restaurantId=${restaurantId}&toutes=true`);
      if (res.ok) {
        const data = await res.json();
        setAnnonces(data.annonces || []);
      }
    } catch {
      // Echec silencieux
    }
    setChargement(false);
  }, [restaurantId]);

  useEffect(() => {
    charger();
  }, [charger]);

  async function uploaderImage(fichier: File): Promise<string | null> {
    const extension = fichier.name.split(".").pop();
    const nomFichier = `${restaurantId}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("restaurant-annonces")
      .upload(nomFichier, fichier, { upsert: true });

    if (uploadError) return null;

    const { data } = supabase.storage.from("restaurant-annonces").getPublicUrl(nomFichier);
    return data.publicUrl;
  }

  async function creerAnnonce() {
    setErreur("");
    if (!titre.trim()) {
      setErreur(t("champs_requis"));
      return;
    }

    setEnvoiEnCours(true);

    let imageUrl: string | null = null;
    if (imageFile) {
      imageUrl = await uploaderImage(imageFile);
    }

    const res = await fetch("/api/annonces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantId,
        titre,
        description: description || undefined,
        imageUrl: imageUrl || undefined,
        dateDebut: dateDebut || undefined,
        dateFin: dateFin || undefined,
      }),
    });

    if (res.ok) {
      setTitre("");
      setDescription("");
      setDateDebut("");
      setDateFin("");
      setImageFile(null);
      setShowForm(false);
      charger();
    } else {
      const data = await res.json();
      setErreur(data.error || t("erreur_generique"));
    }
    setEnvoiEnCours(false);
  }

  async function toggleActif(annonce: Annonce) {
    await fetch("/api/annonces", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: annonce.id, restaurantId, actif: !annonce.actif }),
    });
    setAnnonces((prev) =>
      prev.map((a) => (a.id === annonce.id ? { ...a, actif: !a.actif } : a))
    );
  }

  async function supprimerAnnonce(id: string) {
    await fetch(`/api/annonces?id=${id}&restaurantId=${restaurantId}`, { method: "DELETE" });
    setAnnonces((prev) => prev.filter((a) => a.id !== id));
  }

  if (chargement) return null;

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 16,
        padding: "20px 22px",
        marginBottom: 24,
        boxShadow: "0 4px 16px rgba(31,41,55,0.09)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 10, background: "#412402",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            <Megaphone size={16} color="#FAC775" />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#1F2937", margin: 0 }}>
            Annonces & evenements
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px", borderRadius: 10, border: "1px solid #E5E7EB",
            background: showForm ? "#412402" : "#F4F6F8", color: "#F59E0B",
            fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <Plus size={14} />
          {showForm ? "Annuler" : "Nouvelle annonce"}
        </button>
      </div>

      <p style={{ fontSize: 12.5, color: "#6B7280", marginBottom: 16 }}>
        Annoncez vos evenements, soirees ou spectacles — visibles uniquement sur votre fiche
        publique, avec un compteur "j'aime" pour vos clients.
      </p>

      {showForm && (
        <div style={{ background: "#F4F6F8", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#6B7280", marginBottom: 6 }}>
                Titre *
              </label>
              <input
                type="text"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                placeholder="Soiree live band ce samedi"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#6B7280", marginBottom: 6 }}>
                Description (facultatif)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details de l'evenement..."
                style={{ ...inputStyle, minHeight: 70, resize: "vertical" as const }}
              />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 12, color: "#6B7280", marginBottom: 6 }}>
                  Du (facultatif)
                </label>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 12, color: "#6B7280", marginBottom: 6 }}>
                  Au (facultatif)
                </label>
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#6B7280", marginBottom: 6 }}>
                Image (facultatif)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => {
                  const fichier = e.target.files?.[0] || null;
                  setErreur("");
                  if (fichier && fichier.size > TAILLE_MAX_OCTETS) {
                    setErreur(
                      `Image trop lourde (${(fichier.size / (1024 * 1024)).toFixed(1)} Mo). Limite : 5 Mo.`
                    );
                    setImageFile(null);
                    e.target.value = "";
                    return;
                  }
                  setImageFile(fichier);
                }}
                style={{ fontSize: 12, color: "#6B7280" }}
              />
              <p style={{ fontSize: 11, color: "#6B7280", marginTop: 6 }}>
                JPG, PNG, WebP ou GIF (anime accepte) — 5 Mo maximum. Format conseille : image
                large (paysage), au moins 800x400px, pour un bon rendu sur la fiche.
              </p>
            </div>
          </div>

          {erreur && <p style={{ color: "#F87171", fontSize: 12, marginTop: 10 }}>{erreur}</p>}

          <button
            onClick={creerAnnonce}
            disabled={envoiEnCours}
            style={{
              marginTop: 14, padding: "10px 20px", borderRadius: 10, border: "none",
              background: envoiEnCours ? "#6B7280" : "#F59E0B", color: "#F4F6F8",
              fontWeight: 700, fontSize: 13, cursor: envoiEnCours ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {envoiEnCours ? "Publication..." : "Publier l'annonce"}
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {annonces.length === 0 && (
          <p style={{ fontSize: 13, color: "#6B7280" }}>Aucune annonce pour le moment.</p>
        )}
        {annonces.map((a) => (
          <div
            key={a.id}
            style={{
              padding: "10px 14px", borderRadius: 12, background: "#F4F6F8",
              fontSize: 13, display: "flex", gap: 12, alignItems: "center",
              opacity: a.actif ? 1 : 0.55,
            }}
          >
            {a.image_url && (
              <img
                src={a.image_url}
                alt=""
                style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ color: "#1F2937" }}>{a.titre}</strong>
              {(a.date_debut || a.date_fin) && (
                <span style={{ color: "#6B7280", fontSize: 11, marginLeft: 8 }}>
                  {a.date_debut || "..."} → {a.date_fin || "..."}
                </span>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2, color: "#F09595" }}>
                <Heart size={11} fill="#F09595" />
                <span style={{ fontSize: 11 }}>{a.likes_count}</span>
              </div>
            </div>
            <button
              onClick={() => toggleActif(a)}
              title={a.actif ? "Desactiver" : "Activer"}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: a.actif ? "#97C459" : "#6B7280", flexShrink: 0,
              }}
            >
              {a.actif ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            <button
              onClick={() => supprimerAnnonce(a.id)}
              title="Supprimer"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#F09595", flexShrink: 0 }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "2px solid #E5E7EB",
  borderRadius: 10,
  fontSize: 13,
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
  background: "#FFFFFF",
  color: "#1F2937",
};
