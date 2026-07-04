import { getTemplate } from "./templates";

const ULTRAMSG_BASE_URL = "https://api.ultramsg.com";

const PREFIXES_PAYS: Record<string, string> = {
  CI: "225",
  SN: "221",
  ML: "223",
  CM: "237",
  BF: "226",
  BJ: "229",
  TG: "228",
  NE: "227",
  GN: "224",
  CD: "243",
  GA: "241",
  CG: "242",
  TD: "235",
  CF: "236",
  GH: "233",
  NG: "234",
  KE: "254",
  AO: "244",
  MZ: "258",
  GW: "245",
  CV: "238",
  GQ: "240",
};

interface EnvoiParams {
  telephone: string;
  pays: string;
  langue: "fr" | "en" | "es" | "pt";
  typeEvenement: string;
  templateParams: {
    restaurantNom: string;
    date?: string;
    heure?: string;
    nbPersonnes?: number;
    montant?: string;
    qrCodeUrl?: string;
    type?: "retrait" | "sur_place";
  };
}

interface EnvoiResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

function formaterNumero(telephone: string, pays: string): string {
  let num = telephone.replace(/[\s\-\.\(\)]/g, "");
  if (num.startsWith("+")) {
    num = num.substring(1);
  }
  if (num.startsWith("0")) {
    const prefixe = PREFIXES_PAYS[pays] || "225";
    num = prefixe + num.substring(1);
  }
  return num;
}

export async function envoyerNotificationWhatsApp(
  params: EnvoiParams
): Promise<EnvoiResult> {
  const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
  const token = process.env.ULTRAMSG_TOKEN;

  if (!instanceId || !token) {
    console.warn("[WhatsApp] ULTRAMSG_INSTANCE_ID ou ULTRAMSG_TOKEN non configures.");
    return { success: false, error: "Configuration UltraMsg manquante" };
  }

  try {
    const numero = formaterNumero(params.telephone, params.pays);
    const message = getTemplate(params.typeEvenement, params.langue, params.templateParams);

    const body = JSON.stringify({
      to: numero,
      body: message,
    });

    const url = ULTRAMSG_BASE_URL + "/" + instanceId + "/messages/chat?token=" + token;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    });

    const data = await response.json();

    if (data.status === "success" || data.sent === true) {
      return {
        success: true,
        messageId: data.id || data.message_id,
      };
    }

    console.error("[WhatsApp] Erreur envoi:", data);
    return {
      success: false,
      error: data.message || data.error || "Erreur inconnue UltraMsg",
    };
  } catch (error) {
    console.error("[WhatsApp] Exception:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}