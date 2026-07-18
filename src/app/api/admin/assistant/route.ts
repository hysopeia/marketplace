import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function estSuperAdmin(supabase: ReturnType<typeof createClient>): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("super_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return !!data;
}

const SYSTEME = `Tu es l'assistant du tableau de bord super_admin d'AfriTable, une plateforme
SaaS de gestion de restaurants en Afrique de l'Ouest. Tu reponds au super_admin (l'operateur
de la plateforme, pas un restaurateur) sur la sante business de la plateforme : croissance,
revenus, restaurants a risque ou en forte progression, satisfaction client.

Regles :
- Reponds en francais, ton direct et professionnel, pas de flatterie.
- Base-toi UNIQUEMENT sur les chiffres fournis dans le contexte ci-dessous. N'invente jamais
  de chiffre, de nom de restaurant, ou de cause absente du contexte.
- Si le contexte ne permet pas de repondre a la question, dis-le clairement plutot que de
  deviner.
- Reponses courtes (3-5 phrases), actionnables. Pas de markdown, pas de listes a puces sauf
  si vraiment necessaire pour la clarte.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, statsContext } = body;

    if (!statsContext) {
      return NextResponse.json({ error: "statsContext requis" }, { status: 400 });
    }

    const supabase = createClient();

    if (!(await estSuperAdmin(supabase))) {
      return NextResponse.json({ error: "Acces reserve au super_admin" }, { status: 403 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Assistant non configure (ANTHROPIC_API_KEY manquante)" },
        { status: 503 }
      );
    }

    const contexteTexte = `Donnees plateforme (periode : ${statsContext.periode} jours) :
- Restaurants actifs : ${statsContext.totalRestaurants} (dont ${statsContext.nouveauxRestaurants} nouveaux sur la periode)
- Repartition par pack : ${JSON.stringify(statsContext.parTier)}
- Chiffre d'affaires plateforme sur la periode : ${statsContext.revenuActuel} FCFA (evolution vs periode precedente : ${statsContext.evolutionRevenu != null ? statsContext.evolutionRevenu + "%" : "non disponible"})
- Revenus recurrents estimes pour AfriTable (abonnements actifs) : ${statsContext.revenuPlateformeEstime} FCFA/mois
- Nombre de commandes sur la periode : ${statsContext.nombreCommandes}
- Clients actifs sur la periode : ${statsContext.clientsActifs}
- Satisfaction client globale : ${statsContext.satisfaction != null ? statsContext.satisfaction + "%" : "non disponible"} (sur ${statsContext.totalAvis} avis)
- Top restaurants par CA sur la periode : ${statsContext.topRestaurants.map((r: { nom: string; revenu: number }) => `${r.nom} (${r.revenu} FCFA)`).join(", ") || "aucun"}`;

    const messageUtilisateur = question
      ? `${contexteTexte}\n\nQuestion du super_admin : ${question}`
      : `${contexteTexte}\n\nDonne une observation courte et utile sur l'etat de la plateforme en ce moment — ce qui merite l'attention du super_admin en priorite.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 400,
        system: SYSTEME,
        messages: [{ role: "user", content: messageUtilisateur }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[Assistant IA] Erreur API Anthropic:", errText);
      return NextResponse.json({ error: "Erreur assistant IA" }, { status: 502 });
    }

    const data = await response.json();
    const texte = data.content?.find((b: { type: string }) => b.type === "text")?.text || "";

    return NextResponse.json({ reponse: texte });
  } catch (error) {
    console.error("[Assistant IA] Exception:", error);
    return NextResponse.json({ error: "Erreur interne serveur" }, { status: 500 });
  }
}
