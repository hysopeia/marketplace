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
  const [platEnEdition, setPlatEnEdition] = useState<string | null>(null);
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

  async function renommerCategorie(cat: Categorie) {
    const nom = prompt(t("menu_nom_categorie_prompt"), cat.nom);
    if (!nom || nom === cat.nom) return;
    await fetch("/api/menu", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId, type: "categorie", id: cat.id, nom }),
    });
    chargerMenu();
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

  function demarrerEditionPlat(categorieId: string, plat: Plat) {
    setFormPlatCategorieId(categorieId);
    setPlatEnEdition(plat.id);
    setPlatNom(plat.nom);
    setPlatPrix(String(plat.prix));
    setPlatPhotoUrl(plat.photo_url || "");
    setErreur("");
  }

  function annulerFormulairePlat() {
    setFormPlatCategorieId(null);
    setPlatEnEdition(null);
    setPlatNom("");
    setPlatPrix("");
    setPlatPhotoUrl("");
    setErreur("");
  }

  async function enregistrerPlat(categorieId: string) {
    setErreur("");
    if (!platNom || !platPrix) {
      setErreur(t("champs_requis"));
      return;
    }

    const res = platEnEdition
      ? await fetch("/api/menu", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            restaurantId,
            type: "plat",
            id: platEnEdition,
            nom: platNom,
            prix: Number(platPrix),
            photoUrl: platPhotoUrl || null,
          }),
        })
      : await fetch("/api/menu", {
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
      annulerFormulairePlat();
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
    // Mise a jour optimiste de l'affichage avant meme la reponse reseau
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        items: cat.items.map((it) =>
          it.id === plat.id ? { ...it, disponible: !it.disponible } : it
        ),
      }))
    );
    const res = await fetch("/api/menu", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantId,
        type: "plat",
        id: plat.id,
        disponible: !plat.disponible,
      }),
    });
    if (!res.ok) chargerMenu();
  }

  if (chargement) {
    return <p style={{ fontSize: 13, color: "#9BB5A5" }}>{t("chargement")}</p>;
  }

  return (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div style={{ width: 380, flexShrink: 0, minWidth: 0 }}>
      <button
        onClick={ajouterCategorie}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 16px", borderRadius: 10, border: "none",
          background: "#F59E0B", color: "#F3EFE4", fontSize: 13, fontWeight: 600,
          cursor: "pointer", fontFamily: "inherit", marginBottom: 20,
        }}
      >
        <Plus size={15} />
        {t("menu_ajouter_categorie")}
      </button>

      {categories.length === 0 ? (
        <p style={{ fontSize: 13, color: "#9BB5A5" }}>{t("menu_vide")}</p>
      ) : (
        categories.map((cat) => (
          <div key={cat.id} style={{
            background: "#0F3320", borderRadius: 16, padding: 20, marginBottom: 16,
            boxShadow: "0 2px 8px rgba(31,41,55,0.06)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700, margin: 0 }}>
                {cat.nom || t("dash_avis_anonyme")}
              </h3>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => renommerCategorie(cat)}
                  style={{
                    background: "none", border: "none", color: "#9BB5A5",
                    cursor: "pointer", padding: 4,
                  }}
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => supprimerCategorie(cat.id)}
                  style={{
                    background: "none", border: "none", color: "#F09595",
                    cursor: "pointer", padding: 4,
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {cat.items.map((plat) => (
                <div key={plat.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 12px", borderRadius: 12, background: "#0B2818",
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
                      width: 44, height: 44, borderRadius: 8, background: "#1D4A31",
                      flexShrink: 0,
                    }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{plat.nom}</p>
                    <p style={{ fontSize: 13, color: "#F59E0B", fontWeight: 700, margin: 0 }}>
                      {plat.prix.toLocaleString()} FCFA
                    </p>
                  </div>
                  <button
                    onClick={() => demarrerEditionPlat(cat.id, plat)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#9BB5A5", padding: 4 }}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => toggleDisponible(plat)}
                    title={plat.disponible ? t("menu_masquer") : t("menu_afficher")}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#9BB5A5", padding: 4 }}
                  >
                    {plat.disponible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button
                    onClick={() => supprimerPlat(plat.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#F09595", padding: 4 }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            {formPlatCategorieId === cat.id ? (
              <div style={{ padding: 14, borderRadius: 12, background: "#0B2818" }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#F3EFE4", margin: "0 0 8px" }}>
                  {platEnEdition ? t("menu_modifier_plat") : t("menu_ajouter_plat")}
                </p>
                {erreur && <p style={{ fontSize: 12, color: "#F09595", marginBottom: 8 }}>{erreur}</p>}
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input
                    type="text"
                    value={platNom}
                    onChange={(e) => setPlatNom(e.target.value)}
                    placeholder={t("menu_nom_plat_placeholder")}
                    style={{
                      flex: "1 1 60%", minWidth: 0, padding: "8px 12px", border: "1px solid #1D4A31",
                      borderRadius: 8, fontSize: 13, boxSizing: "border-box",
                    }}
                  />
                  <input
                    type="number"
                    value={platPrix}
                    onChange={(e) => setPlatPrix(e.target.value)}
                    placeholder={t("menu_prix_placeholder")}
                    style={{
                      flex: "1 1 40%", minWidth: 0, padding: "8px 12px", border: "1px solid #1D4A31",
                      borderRadius: 8, fontSize: 13, boxSizing: "border-box",
                    }}
                  />
                </div>
                <label style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
                  border: "1px dashed #1D4A31", borderRadius: 8, fontSize: 13,
                  cursor: "pointer", marginBottom: 10, color: "#9BB5A5",
                }}>
                  <ImagePlus size={15} />
                  {uploadEnCours ? t("chargement") : platPhotoUrl ? t("menu_photo_ajoutee") : t("menu_ajouter_photo")}
                  <input type="file" accept="image/*" onChange={handleUploadPhoto} style={{ display: "none" }} />
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => enregistrerPlat(cat.id)}
                    style={{
                      padding: "8px 18px", borderRadius: 8, border: "none",
                      background: "#F59E0B", color: "#F3EFE4", fontSize: 13, fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {t("menu_enregistrer")}
                  </button>
                  <button
                    onClick={annulerFormulairePlat}
                    style={{
                      padding: "8px 18px", borderRadius: 8, border: "1px solid #1D4A31",
                      background: "#0F3320", color: "#9BB5A5", fontSize: 13, fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {t("caisse_annuler")}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setFormPlatCategorieId(cat.id); setPlatEnEdition(null); }}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 14px", borderRadius: 8, border: "1px dashed #1D4A31",
                  background: "#0F3320", color: "#9BB5A5", fontSize: 13, fontWeight: 600,
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

      {/* Apercu fidele a ce que voit reellement le client sur la page
          publique (fond clair, meme grille et memes cartes que
          RestaurantDetail.tsx) — volontairement clair meme si l'outil
          de gestion autour est en theme sombre, pour representer avec
          exactitude le rendu final. */}
      <div style={{
        flex: "1 1 380px", minWidth: 0, background: "#FDF8F0",
        borderRadius: 16, padding: 20, position: "sticky", top: 20,
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>
          {t("menu_apercu_titre")}
        </p>
        {categories.length === 0 ? (
          <p style={{ fontSize: 13, color: "#9CA3AF" }}>{t("menu_apercu_vide")}</p>
        ) : (
          categories.map((cat) => (
            <div key={cat.id} style={{ marginBottom: 28 }}>
              <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 12, color: "#1A1A2E" }}>
                {cat.nom || t("dash_avis_anonyme")}
              </h3>
              {cat.items.length === 0 ? (
                <p style={{ fontSize: 12, color: "#9CA3AF" }}>{t("menu_apercu_categorie_vide")}</p>
              ) : (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(min(140px, 100%), 1fr))",
                  gap: 12,
                }}>
                  {cat.items.map((item) => (
                    <div key={item.id} style={{
                      background: "white", border: "1px solid #E5E1D8",
                      borderRadius: 12, overflow: "hidden",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                      opacity: item.disponible ? 1 : 0.5,
                    }}>
                      {item.photo_url ? (
                        <div style={{ height: 90, overflow: "hidden" }}>
                          <img src={item.photo_url} alt={item.nom} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      ) : (
                        <div style={{
                          height: 60, background: "#F3F4F6", display: "flex",
                          alignItems: "center", justifyContent: "center",
                          color: "#9CA3AF", fontSize: 10,
                        }}>
                          {t("menu_apercu_pas_de_photo")}
                        </div>
                      )}
                      <div style={{ padding: 10 }}>
                        <p style={{ fontWeight: 600, fontSize: 12.5, color: "#1A1A2E", margin: "0 0 2px" }}>
                          {item.nom || t("menu_apercu_sans_nom")}
                        </p>
                        <p style={{ fontSize: 12, color: "#C75B39", fontWeight: 700, margin: 0 }}>
                          {item.prix.toLocaleString()} FCFA
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
