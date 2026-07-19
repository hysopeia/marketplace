/**
 * Envoi d'email via l'API Resend (https://resend.com), pour les
 * notifications internes a la plateforme (ex: nouvelle demande de
 * partenariat). Necessite RESEND_API_KEY en variable d'environnement.
 *
 * Volontairement minimal (pas de SDK, juste fetch) pour rester coherent
 * avec le reste du projet (WhatsApp/CinetPay/ElyonPay fonctionnent pareil).
 */

interface EnvoiEmailParams {
  a: string;
  sujet: string;
  html: string;
}

export async function envoyerEmail({ a, sujet, html }: EnvoiEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const expediteur = process.env.RESEND_FROM_EMAIL || "AfriTable <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn("[Email] RESEND_API_KEY non configuree — notification ignoree.");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: expediteur,
        to: [a],
        subject: sujet,
        html,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[Email] Erreur envoi Resend:", errText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Email] Exception envoi:", error);
    return false;
  }
}
