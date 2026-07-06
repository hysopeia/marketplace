"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2, Pencil, ImagePlus, Eye, EyeOff } from "lucide-react";

type Plat = {
  id: string;
  nom: string;
  description: string;
  prix: number;
  photo_url: string | null;
  disponible: boolean;
};

type Categorie = {
  id: string;
  nom: string;
  items: Plat[];
};

export default function GestionMenu({ restaurantId }: { restaurantId: string }) {
  const t = useTranslations();
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [chargement, setChargement] = useState(true);
  const [formPlatCategorieId, setFormPlatCategorieId] = useState<string | null>(null);
  const [platNom, setPlatNom] = useState("");
  const [platPrix, setPlatPrix] = useState("");
  const [platPhotoUrl, setPlatPhotoUrl] = useState("");
  const [uploadEnCours, setUploadEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  const chargerMenu = useCallback(async () => {
    try {
      const res = await fetch(`/api/menu?restaurantId=${restaurantId}`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch {
      // Echec silencieux
    }
    setChargement(false);
  }, [restaurantId]);

  useEffect(() => {
    chargerMenu();
  }, [chargerMenu]);

  async function ajouterCategorie() {
    const nom = prompt(t("menu_nom_categorie_prompt"));
    if (!nom) return;
    const res = await fetch("/api/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId, action: "categorie", nom }),
    });
    if (res.ok) chargerMenu();
  }

  async function supprimerCategorie(id: string) {
    if (!confirm(t("menu_confirmer_suppression_categorie"))) return;
    await fetch(`/api/menu?id=${id}&type=categorie&restaurantId=${restaurantId}`, {
      method: "DELETE",
    });
    chargerMenu();
  }

  async function handleUploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;

    setUploadEnCours(true);
    setErreur("");
    try {
      const supabase = createClient();
      const extension = fichier.name.split(".").pop();
      const nomFichier = `${restaurantId}/${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("menu-photos")
        .upload(nomFichier, fichier, { upsert: true });

      if (uploadError) {
        setErreur(t("menu_erreur_upload"));
        setUploadEnCours(false);
        return;
      }

      const { data } = supabase.storage.from("menu-photos").getPublicUrl(nomFichier);
      setPlatPhotoUrl(data.publicUrl);
    } catch {
      setErreur(t("menu_erreur_upload"));
    }
    setUploadEnCours(false);
  }

  async function ajouterPlat(categorieId: string) {
    setErreur("");
    if (!platNom || !platPrix) {
      setErreur(t("champs_requis"));
      return;
    }

    const res = await fetch("/api/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantId,
        action: "plat",
        categorieId,
        nom: platNom,
        prix: Number(platPrix),
        photoUrl: platPhotoUrl || null,
      }),
    });

    if (res.ok) {
      setFormPlatCategorieId(null);
      setPlatNom("");
      setPlatPrix("");
      setPlatPhotoUrl("");
      chargerMenu();
    } else {
      const data = await res.json();
      setErreur(data.error || t("erreur_generique"));
    }
  }

  async function supprimerPlat(id: string) {
    if (!confirm(t("menu_confirmer_suppression_plat"))) return;
    await fetch(`/api/menu?id=${id}&type=plat&restaurantId=${restaurantId}`, {
      method: "DELETE",
    });
    chargerMenu();
  }

  async function toggleDisponible(plat: Plat) {
    await fetch("/api/menu", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantId,
        type: "plat",
        id: plat.id,
        disponible: !plat.disponible,
      }),
    });
    chargerMenu();
  }

  if (chargement) {
    return <p style={{ fontSize: 13, color: "#9CA3AF" }}>{t("chargement")}</p>;
  }

  return (
    <div>
      <button
        onClick={ajouterCategorie}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 16px", borderRadius: 10, border: "none",
          background: "#C75B39", color: "white", fontSize: 13, fontWeight: 600,
          cursor: "pointer", fontFamily: "inherit", marginBottom: 20,
        }}
      >
        <Plus size={15} />
        {t("menu_ajouter_categorie")}
      </button>

      {categories.length === 0 ? (
        <p style={{ fontSize: 13, color: "#9CA3AF" }}>{t("menu_vide")}</p>
      ) : (
        categories.map((cat) => (
          <div key={cat.id} style={{
            background: "white", borderRadius: 16, padding: 20, marginBottom: 16,
            boxShadow: "0 2px 8px rgba(38,34,28,0.06)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700, margin: 0 }}>
                {cat.nom || t("dash_avis_anonyme")}
              </h3>
              <button
                onClick={() => supprimerCategorie(cat.id)}
                style={{
                  background: "none", border: "none", color: "#B91C1C",
                  cursor: "pointer", padding: 4,
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {cat.items.map((plat) => (
                <div key={plat.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 12px", borderRadius: 12, background: "#FDF8F0",
                  opacity: plat.disponible ? 1 : 0.5,
                }}>
                  {plat.photo_url ? (
                    <img
                      src={plat.photo_url}
                      alt={plat.nom}
                      style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{
                      width: 44, height: 44, borderRadius: 8, background: "#E5E1D8",
                      flexShrink: 0,
                    }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{plat.nom}</p>
                    <p style={{ fontSize: 13, color: "#C75B39", fontWeight: 700, margin: 0 }}>
                      {plat.prix.toLocaleString()} FCFA
                    </p>
                  </div>
                  <button
                    onClick={() => toggleDisponible(plat)}
                    title={plat.disponible ? t("menu_masquer") : t("menu_afficher")}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", padding: 4 }}
                  >
                    {plat.disponible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button
                    onClick={() => supprimerPlat(plat.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#B91C1C", padding: 4 }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            {formPlatCategorieId === cat.id ? (
              <div style={{ padding: 14, borderRadius: 12, background: "#FDF8F0" }}>
                {erreur && <p style={{ fontSize: 12, color: "#B91C1C", marginBottom: 8 }}>{erreur}</p>}
                <input
                  type="text"
                  value={platNom}
                  onChange={(e) => setPlatNom(e.target.value)}
                  placeholder={t("menu_nom_plat_placeholder")}
                  style={{
                    width: "100%", padding: "8px 12px", border: "1px solid #E5E1D8",
                    borderRadius: 8, fontSize: 13, marginBottom: 8, boxSizing: "border-box",
                  }}
                />
                <input
                  type="number"
                  value={platPrix}
                  onChange={(e) => setPlatPrix(e.target.value)}
                  placeholder={t("menu_prix_placeholder")}
                  style={{
                    width: "100%", padding: "8px 12px", border: "1px solid #E5E1D8",
                    borderRadius: 8, fontSize: 13, marginBottom: 8, boxSizing: "border-box",
                  }}
                />
                <label style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
                  border: "1px dashed #E5E1D8", borderRadius: 8, fontSize: 13,
                  cursor: "pointer", marginBottom: 10, color: "#6B7280",
                }}>
                  <ImagePlus size={15} />
                  {uploadEnCours ? t("chargement") : platPhotoUrl ? t("menu_photo_ajoutee") : t("menu_ajouter_photo")}
                  <input type="file" accept="image/*" onChange={handleUploadPhoto} style={{ display: "none" }} />
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => ajouterPlat(cat.id)}
                    style={{
                      padding: "8px 18px", borderRadius: 8, border: "none",
                      background: "#C75B39", color: "white", fontSize: 13, fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {t("menu_enregistrer")}
                  </button>
                  <button
                    onClick={() => { setFormPlatCategorieId(null); setPlatNom(""); setPlatPrix(""); setPlatPhotoUrl(""); }}
                    style={{
                      padding: "8px 18px", borderRadius: 8, border: "1px solid #E5E1D8",
                      background: "white", color: "#6B7280", fontSize: 13, fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {t("caisse_annuler")}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setFormPlatCategorieId(cat.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 14px", borderRadius: 8, border: "1px dashed #E5E1D8",
                  background: "white", color: "#6B7280", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <Plus size={14} />
                {t("menu_ajouter_plat")}
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
