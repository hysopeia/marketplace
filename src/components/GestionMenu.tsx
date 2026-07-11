"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2, Pencil, ImagePlus, Eye, EyeOff, X } from "lucide-react";

type Plat = {
  id: string;
  nom: string;
  description: string;
  prix: number;
  photo_url: string | null;
  sous_categorie: string | null;
  disponible: boolean;
};

type Categorie = {
  id: string;
  nom: string;
  items: Plat[];
};

// Modeles de categories groupes par type de cuisine — pense pour que
// l'admin puisse creer rapidement le menu de n'importe quel restaurant
// (fast-food, africain, europeen, asiatique, pizzeria...) sans avoir a
// taper chaque nom au clavier lors d'une forte affluence d'inscriptions.
const MODELES_CATEGORIES: { groupeCle: string; items: string[] }[] = [
  {
    groupeCle: "menu_modeles_groupe_classiques",
    items: ["menu_modele_entrees", "menu_modele_plats", "menu_modele_accompagnements", "menu_modele_desserts", "menu_modele_boissons", "menu_modele_menus_enfants"],
  },
  {
    groupeCle: "menu_modeles_groupe_fastfood",
    items: ["menu_modele_burgers", "menu_modele_sandwichs", "menu_modele_tacos", "menu_modele_chawarmas", "menu_modele_pizzas", "menu_modele_grillades"],
  },
  {
    groupeCle: "menu_modeles_groupe_autre",
    items: ["menu_modele_petit_dejeuner", "menu_modele_salades", "menu_modele_plat_du_jour"],
  },
];

export default function GestionMenu({
  restaurantId,
  slug,
  pays,
  locale,
}: {
  restaurantId: string;
  slug?: string;
  pays?: string;
  locale?: string;
}) {
  const t = useTranslations();
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [chargement, setChargement] = useState(true);
  const [categoriesMenuOuvert, setCategoriesMenuOuvert] = useState(false);
  const [formPlatCategorieId, setFormPlatCategorieId] = useState<string | null>(null);
  const [platEnEdition, setPlatEnEdition] = useState<string | null>(null);
  const [platNom, setPlatNom] = useState("");
  const [platPrix, setPlatPrix] = useState("");
  const [platDescription, setPlatDescription] = useState("");
  const [platSousCategorie, setPlatSousCategorie] = useState("");
  const [nouvelleCategorieNom, setNouvelleCategorieNom] = useState("");
  const [platPhotoUrl, setPlatPhotoUrl] = useState("");
  const [uploadEnCours, setUploadEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const [refreshApercu, setRefreshApercu] = useState(0);

  const chargerMenu = useCallback(async () => {
    try {
      const res = await fetch(`/api/menu?restaurantId=${restaurantId}`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        // Force le rechargement complet de l'apercu (vraie page publique
        // en direct) apres chaque modification du menu.
        setRefreshApercu((n) => n + 1);
      }
    } catch {
      // Echec silencieux
    }
    setChargement(false);
  }, [restaurantId]);

  useEffect(() => {
    chargerMenu();
  }, [chargerMenu]);

  async function creerCategorieAvecNom(nom: string) {
    if (!nom) return;
    setCategoriesMenuOuvert(false);

    // Evite les doublons : si une categorie du meme nom existe deja
    // (ignorant la casse), on rouvre simplement la modale d'ajout de
    // plat pour celle-ci, plutot que d'en creer une nouvelle.
    const existante = categories.find((c) => c.nom.trim().toLowerCase() === nom.trim().toLowerCase());
    if (existante) {
      setPlatEnEdition(null);
      setFormPlatCategorieId(existante.id);
      return;
    }

    const res = await fetch("/api/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId, action: "categorie", nom }),
    });

    if (res.ok) {
      const data = await res.json();
      await chargerMenu();
      // Ouvre directement la fenetre d'ajout de plat pour cette
      // categorie qu'on vient de creer, sans clic supplementaire.
      if (data.categorie?.id) {
        setPlatEnEdition(null);
        setFormPlatCategorieId(data.categorie.id);
      }
    }
  }

  const NOUVELLE_CATEGORIE = "__NOUVELLE__";

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

    setErreur("");

    const categorieActuelle = categories.find((c) => c.id === formPlatCategorieId);
    const nomCategoriePourUpload =
      formPlatCategorieId === NOUVELLE_CATEGORIE ? nouvelleCategorieNom : (categorieActuelle?.nom || "");
    const estCategorieBoissons = nomCategoriePourUpload.toLowerCase().includes("boisson");
    const TAILLE_MAX = (estCategorieBoissons ? 3 : 5) * 1024 * 1024;
    if (fichier.size > TAILLE_MAX) {
      setErreur(estCategorieBoissons ? t("menu_photo_trop_lourde_boissons") : t("menu_photo_trop_lourde"));
      return;
    }

    setUploadEnCours(true);
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
    setPlatDescription(plat.description || "");
    setPlatSousCategorie(plat.sous_categorie || "");
    setPlatPhotoUrl(plat.photo_url || "");
    setErreur("");
  }

  function annulerFormulairePlat() {
    setFormPlatCategorieId(null);
    setPlatEnEdition(null);
    setPlatNom("");
    setPlatPrix("");
    setPlatDescription("");
    setPlatSousCategorie("");
    setPlatPhotoUrl("");
    setNouvelleCategorieNom("");
    setErreur("");
  }

  async function enregistrerPlat(categorieId: string) {
    setErreur("");
    if (!platNom || !platPrix) {
      setErreur(t("champs_requis"));
      return;
    }

    let categorieIdReelle = categorieId;

    if (categorieId === NOUVELLE_CATEGORIE) {
      if (!nouvelleCategorieNom.trim()) {
        setErreur(t("menu_nom_categorie_requis"));
        return;
      }

      // Reutilise une categorie existante du meme nom au lieu d'en
      // recreer une (memes garde-fous que dans creerCategorieAvecNom).
      const existante = categories.find(
        (c) => c.nom.trim().toLowerCase() === nouvelleCategorieNom.trim().toLowerCase()
      );

      if (existante) {
        categorieIdReelle = existante.id;
      } else {
        const resCategorie = await fetch("/api/menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ restaurantId, action: "categorie", nom: nouvelleCategorieNom }),
        });
        if (!resCategorie.ok) {
          setErreur(t("erreur_generique"));
          return;
        }
        const dataCategorie = await resCategorie.json();
        categorieIdReelle = dataCategorie.categorie.id;
      }
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
            description: platDescription,
            sousCategorie: platSousCategorie,
            categorieId: categorieIdReelle,
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
            categorieId: categorieIdReelle,
            nom: platNom,
            description: platDescription,
            sousCategorie: platSousCategorie,
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

  // Heuristique : une categorie est consideree comme "boissons" si son
  // nom contient ce mot (couvre le modele preconfigure ainsi que les
  // categories personnalisees nommees explicitement "Boissons").
  const categorieSelectionnee = categories.find((c) => c.id === formPlatCategorieId);
  const nomCategorieActive =
    formPlatCategorieId === NOUVELLE_CATEGORIE ? nouvelleCategorieNom : (categorieSelectionnee?.nom || "");
  const estBoissons = nomCategorieActive.toLowerCase().includes("boisson");

  const TYPES_BOISSONS = [
    "menu_type_eau", "menu_type_alcoolisee", "menu_type_non_alcoolisee",
    "menu_type_jus_naturel", "menu_type_sucrerie",
  ];
  const typesSelectionnes = platSousCategorie.split(",").map((s) => s.trim()).filter(Boolean);

  function toggleTypeBoisson(type: string) {
    const set = new Set(typesSelectionnes);
    if (set.has(type)) set.delete(type); else set.add(type);
    setPlatSousCategorie(Array.from(set).join(", "));
  }

  if (chargement) {
    return <p style={{ fontSize: 13, color: "#9BB5A5" }}>{t("chargement")}</p>;
  }

  return (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div style={{ width: 380, flexShrink: 0, minWidth: 0 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, position: "relative" }}>
      <button
        onClick={() => setCategoriesMenuOuvert(!categoriesMenuOuvert)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 16px", borderRadius: 10, border: "none",
          background: "#F59E0B", color: "#F3EFE4", fontSize: 13, fontWeight: 600,
          cursor: "pointer", fontFamily: "inherit",
        }}
      >
        <Plus size={15} />
        {t("menu_categories_bouton")}
      </button>
      {categoriesMenuOuvert && (
        <>
          <div
            onClick={() => setCategoriesMenuOuvert(false)}
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
          />
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0,
            width: 260, maxHeight: 380, overflowY: "auto",
            background: "white", borderRadius: 14, boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
            zIndex: 41, padding: "8px 0",
          }}>
            {MODELES_CATEGORIES.map((groupe) => (
              <div key={groupe.groupeCle}>
                <p style={{
                  fontSize: 10.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase",
                  letterSpacing: 0.4, padding: "8px 14px 4px",
                }}>
                  {t(groupe.groupeCle)}
                </p>
                {groupe.items.map((cle) => (
                  <button
                    key={cle}
                    onClick={() => creerCategorieAvecNom(t(cle))}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "8px 14px", border: "none", background: "none",
                      fontSize: 13, color: "#1A1A2E", cursor: "pointer", fontFamily: "inherit",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#FDF8F0")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    {t(cle)}
                  </button>
                ))}
              </div>
            ))}
            <div style={{ borderTop: "1px solid #E5E1D8", marginTop: 4, paddingTop: 4 }}>
              <button
                onClick={() => {
                  setCategoriesMenuOuvert(false);
                  setPlatEnEdition(null);
                  setNouvelleCategorieNom("");
                  setFormPlatCategorieId(NOUVELLE_CATEGORIE);
                }}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "8px 14px", border: "none", background: "none",
                  fontSize: 13, color: "#F59E0B", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {t("menu_categorie_personnalisee")}
              </button>
            </div>
          </div>
        </>
      )}
      {categories.length > 0 && (
        <button
          onClick={() => {
            setFormPlatCategorieId(categories[0].id);
            setPlatEnEdition(null);
          }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 10, border: "1px solid #1D4A31",
            background: "#0F3320", color: "#F3EFE4", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <Plus size={15} />
          {t("menu_ajouter_plat")}
        </button>
      )}
      </div>

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
          </div>
        ))
      )}
      </div>

      {/* Vraie page publique en direct dans un cadre — plus fiable
          qu'une reconstruction manuelle : elle montre TOUT (reservation,
          a emporter, livraison, avis, fidelite, promotions, partage),
          exactement ce que le client verra en scannant le QR, meme
          avant d'avoir rempli le menu (les etats vides reels s'affichent). */}
      <div style={{
        flex: "1 1 380px", minWidth: 320, position: "sticky", top: 20,
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
          {t("menu_apercu_titre")}
        </p>
        {slug && pays && locale ? (
          <div style={{
            border: "1px solid #1D4A31", borderRadius: 16, overflow: "hidden",
            background: "#FDF8F0", height: 640,
          }}>
            <iframe
              key={refreshApercu}
              src={`/${locale}/${pays.toLowerCase()}/${slug}`}
              title="Apercu de la page publique"
              style={{ width: "100%", height: "100%", border: "none" }}
            />
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "#9CA3AF" }}>{t("menu_apercu_indisponible")}</p>
        )}
      </div>

      {formPlatCategorieId && (
        <>
          <div
            onClick={annulerFormulairePlat}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(4px)", zIndex: 200,
            }}
          />
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            width: 420, maxWidth: "92vw", background: "white", borderRadius: 20,
            padding: 28, zIndex: 201, boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
            maxHeight: "90vh", overflow: "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, color: "#1A1A2E" }}>
                {platEnEdition
                  ? (estBoissons ? t("menu_modifier_boisson") : t("menu_modifier_plat"))
                  : (estBoissons ? t("menu_ajouter_boisson") : t("menu_ajouter_plat"))}
              </h2>
              <button
                onClick={annulerFormulairePlat}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: "1px solid #E5E1D8",
                  background: "white", cursor: "pointer", display: "flex",
                  alignItems: "center", justifyContent: "center", color: "#6B7280",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {erreur && <p style={{ fontSize: 12, color: "#B91C1C", marginBottom: 12 }}>{erreur}</p>}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#1A1A2E", marginBottom: 6 }}>
                  {t("menu_categorie_label")}
                </label>
                {formPlatCategorieId === NOUVELLE_CATEGORIE ? (
                  <input
                    type="text"
                    autoFocus
                    value={nouvelleCategorieNom}
                    onChange={(e) => setNouvelleCategorieNom(e.target.value)}
                    placeholder={t("menu_nom_categorie_prompt")}
                    style={{
                      width: "100%", padding: "11px 14px", border: "2px solid #E5E1D8",
                      borderRadius: 10, fontSize: 14, outline: "none",
                      fontFamily: "inherit", boxSizing: "border-box",
                    }}
                  />
                ) : (
                  <select
                    value={formPlatCategorieId || ""}
                    onChange={(e) => setFormPlatCategorieId(e.target.value)}
                    style={{
                      width: "100%", padding: "11px 14px", border: "2px solid #E5E1D8",
                      borderRadius: 10, fontSize: 14, outline: "none",
                      fontFamily: "inherit", boxSizing: "border-box", background: "white",
                    }}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#1A1A2E", marginBottom: 6 }}>
                  {estBoissons ? t("menu_nom_boisson_label") : t("menu_nom_plat_label")}
                </label>
                <input
                  type="text"
                  value={platNom}
                  onChange={(e) => setPlatNom(e.target.value)}
                  placeholder={estBoissons ? t("menu_nom_boisson_placeholder") : t("menu_nom_plat_placeholder")}
                  style={{
                    width: "100%", padding: "11px 14px", border: "2px solid #E5E1D8",
                    borderRadius: 10, fontSize: 14, outline: "none",
                    fontFamily: "inherit", boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#1A1A2E", marginBottom: 6 }}>
                  {t("menu_sous_categorie_label")}
                </label>
                {estBoissons ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {TYPES_BOISSONS.map((cle) => {
                      const libelle = t(cle);
                      const coche = typesSelectionnes.includes(libelle);
                      return (
                        <label key={cle} style={{
                          display: "flex", alignItems: "center", gap: 8, fontSize: 13.5,
                          color: "#1A1A2E", cursor: "pointer",
                        }}>
                          <input
                            type="checkbox"
                            checked={coche}
                            onChange={() => toggleTypeBoisson(libelle)}
                            style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#F59E0B" }}
                          />
                          {libelle}
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={platSousCategorie}
                    onChange={(e) => setPlatSousCategorie(e.target.value)}
                    placeholder={t("menu_sous_categorie_placeholder")}
                    style={{
                      width: "100%", padding: "11px 14px", border: "2px solid #E5E1D8",
                      borderRadius: 10, fontSize: 14, outline: "none",
                      fontFamily: "inherit", boxSizing: "border-box",
                    }}
                  />
                )}
                <p style={{ fontSize: 11.5, color: "#9CA3AF", marginTop: 4 }}>
                  {estBoissons ? t("menu_sous_categorie_aide_boissons") : t("menu_sous_categorie_aide")}
                </p>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#1A1A2E", marginBottom: 6 }}>
                  {t("menu_prix_label")}
                </label>
                <input
                  type="number"
                  value={platPrix}
                  onChange={(e) => setPlatPrix(e.target.value)}
                  placeholder={t("menu_prix_placeholder")}
                  style={{
                    width: "100%", padding: "11px 14px", border: "2px solid #E5E1D8",
                    borderRadius: 10, fontSize: 14, outline: "none",
                    fontFamily: "inherit", boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#1A1A2E", marginBottom: 6 }}>
                  {t("menu_description_label")}
                </label>
                <textarea
                  value={platDescription}
                  onChange={(e) => setPlatDescription(e.target.value)}
                  placeholder={estBoissons ? t("menu_description_placeholder_boissons") : t("menu_description_placeholder")}
                  rows={2}
                  style={{
                    width: "100%", padding: "11px 14px", border: "2px solid #E5E1D8",
                    borderRadius: 10, fontSize: 14, outline: "none",
                    fontFamily: "inherit", boxSizing: "border-box", resize: "vertical",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#1A1A2E", marginBottom: 6 }}>
                  {t("menu_photo_label")}
                </label>
                <label style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  padding: 16, border: "2px dashed #E5E1D8", borderRadius: 10, fontSize: 13,
                  cursor: "pointer", color: "#6B7280", textAlign: "center",
                }}>
                  <ImagePlus size={20} />
                  {uploadEnCours ? t("chargement") : platPhotoUrl ? t("menu_photo_ajoutee") : t("menu_photo_choisir")}
                  <input type="file" accept="image/*" onChange={handleUploadPhoto} style={{ display: "none" }} />
                </label>
                <p style={{ fontSize: 11.5, color: "#9CA3AF", marginTop: 4 }}>
                  {estBoissons ? t("menu_photo_aide_boissons") : t("menu_photo_aide")}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button
                onClick={() => enregistrerPlat(formPlatCategorieId)}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 12, border: "none",
                  background: "#F59E0B", color: "white", fontWeight: 600, fontSize: 14,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {t("menu_enregistrer")}
              </button>
              <button
                onClick={annulerFormulairePlat}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 12, border: "2px solid #E5E1D8",
                  background: "white", color: "#6B7280", fontWeight: 600, fontSize: 14,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {t("caisse_annuler")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
