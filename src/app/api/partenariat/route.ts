import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { envoyerEmail } from "@/lib/email/send";

async function estSuperAdmin(supabase: ReturnType<typeof createClient>) {
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nomRestaurant, nomContact, telephone, email, ville, pays, message } = body;

    if (!nomRestaurant || !nomContact || !telephone) {
      return NextResponse.json(
        { error: "Parametres manquants: nomRestaurant, nomContact, telephone" },
        { status: 400 }
      );
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from("partenariat_leads")
      .insert({
        nom_restaurant: nomRestaurant,
        nom_contact: nomContact,
        telephone,
        email: email || null,
        ville: ville || null,
        pays: pays || null,
        message: message || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Erreur creation lead partenariat:", error);
      return NextResponse.json({ error: "Erreur lors de l'enregistrement" }, { status: 500 });
    }

    // Notification email au super_admin — echec silencieux (log uniquement) :
    // une notification manquee ne doit jamais faire echouer la soumission
    // du formulaire pour le restaurant prospect.
    const emailDestination = process.env.ADMIN_NOTIFICATION_EMAIL;
    if (emailDestination) {
      await envoyerEmail({
        a: emailDestination,
        sujet: `Nouvelle demande de partenariat — ${nomRestaurant}`,
        html: `
          <h2>Nouvelle demande de partenariat AfriTable</h2>
          <p><strong>Restaurant :</strong> ${nomRestaurant}</p>
          <p><strong>Contact :</strong> ${nomContact}</p>
          <p><strong>Telephone :</strong> ${telephone}</p>
          ${email ? `<p><strong>Email :</strong> ${email}</p>` : ""}
          ${ville ? `<p><strong>Ville :</strong> ${ville}</p>` : ""}
          ${pays ? `<p><strong>Pays :</strong> ${pays}</p>` : ""}
          ${message ? `<p><strong>Message :</strong> ${message}</p>` : ""}
          <p style="margin-top:20px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || ""}/fr/admin">Voir dans le tableau de bord admin</a>
          </p>
        `,
      });
    }

    return NextResponse.json({ success: true, lead: data });
  } catch (error) {
    console.error("Erreur API partenariat:", error);
    return NextResponse.json({ error: "Erreur interne serveur" }, { status: 500 });
  }
}

// Reserve au super_admin : liste des leads pour suivi commercial.
export async function GET() {
  const supabase = createClient();

  if (!(await estSuperAdmin(supabase))) {
    return NextResponse.json({ error: "Acces reserve au super_admin" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("partenariat_leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ leads: data || [] });
}

// Reserve au super_admin : mise a jour du statut d'un lead (suivi commercial).
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createClient();

    if (!(await estSuperAdmin(supabase))) {
      return NextResponse.json({ error: "Acces reserve au super_admin" }, { status: 403 });
    }

    const body = await request.json();
    const { id, statut } = body;

    if (!id || !["nouveau", "contacte", "converti", "abandonne"].includes(statut)) {
      return NextResponse.json({ error: "Parametres manquants ou statut invalide" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("partenariat_leads")
      .update({ statut })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, lead: data });
  } catch (error) {
    console.error("Erreur PATCH partenariat:", error);
    return NextResponse.json({ error: "Erreur interne serveur" }, { status: 500 });
  }
}
