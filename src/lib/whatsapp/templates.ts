/**
 * Templates de messages WhatsApp traduits par langue.
 * Ne jamais coder de texte en dur dans le code d'envoi.
 * Section 7 du spec : templates par langue du client.
 */

type Langue = "fr" | "en" | "es" | "pt";

interface TemplateParams {
  restaurantNom: string;
  date?: string;
  heure?: string;
  nbPersonnes?: number;
  montant?: string;
  qrCodeUrl?: string;
  type?: "retrait" | "sur_place";
}

const templates: Record<string, Record<Langue, (p: TemplateParams) => string>> = {
  // Confirmation de reservation
  reservation_confirmee: {
    fr: (p) =>
      `✅ *Confirmation de reservation*\n\n` +
      `Restaurant : ${p.restaurantNom}\n` +
      `Date : ${p.date}\n` +
      `Heure : ${p.heure}\n` +
      `Personnes : ${p.nbPersonnes}\n` +
      (p.montant ? `Acompte : ${p.montant}\n` : "") +
      `\nPresentez votre QR code a l'arrivee :\n${p.qrCodeUrl}`,
    en: (p) =>
      `✅ *Reservation confirmed*\n\n` +
      `Restaurant: ${p.restaurantNom}\n` +
      `Date: ${p.date}\n` +
      `Time: ${p.heure}\n` +
      `Guests: ${p.nbPersonnes}\n` +
      (p.montant ? `Deposit: ${p.montant}\n` : "") +
      `\nPresent your QR code on arrival:\n${p.qrCodeUrl}`,
    es: (p) =>
      `✅ *Reserva confirmada*\n\n` +
      `Restaurante : ${p.restaurantNom}\n` +
      `Fecha : ${p.date}\n` +
      `Hora : ${p.heure}\n` +
      `Personas : ${p.nbPersonnes}\n` +
      (p.montant ? `Deposito : ${p.montant}\n` : "") +
      `\nPresente tu codigo QR al llegar :\n${p.qrCodeUrl}`,
    pt: (p) =>
      `✅ *Reserva confirmada*\n\n` +
      `Restaurante : ${p.restaurantNom}\n` +
      `Data : ${p.date}\n` +
      `Hora : ${p.heure}\n` +
      `Pessoas : ${p.nbPersonnes}\n` +
      (p.montant ? `Deposito : ${p.montant}\n` : "") +
      `\nApresente seu QR code na chegada :\n${p.qrCodeUrl}`,
  },

  // Rappel reservation -1h
  rappel_reservation: {
    fr: (p) =>
      `⏰ *Rappel*\n\n` +
      `Votre reservation chez *${p.restaurantNom}* est dans 1 heure.\n` +
      `Date : ${p.date} a ${p.heure}\n` +
      `Personnes : ${p.nbPersonnes}\n\n` +
      `Presentez votre QR code a l'arrivee.`,
    en: (p) =>
      `⏰ *Reminder*\n\n` +
      `Your reservation at *${p.restaurantNom}* is in 1 hour.\n` +
      `Date: ${p.date} at ${p.heure}\n` +
      `Guests: ${p.nbPersonnes}\n\n` +
      `Present your QR code on arrival.`,
    es: (p) =>
      `⏰ *Recordatorio*\n\n` +
      `Tu reserva en *${p.restaurantNom}* es en 1 hora.\n` +
      `Fecha : ${p.date} a las ${p.heure}\n` +
      `Personas : ${p.nbPersonnes}\n\n` +
      `Presenta tu codigo QR al llegar.`,
    pt: (p) =>
      `⏰ *Lembrete*\n\n` +
      `Sua reserva em *${p.restaurantNom}* e em 1 hora.\n` +
      `Data : ${p.date} as ${p.heure}\n` +
      `Pessoas : ${p.nbPersonnes}\n\n` +
      `Apresente seu QR code na chegada.`,
  },

  // Commande recue (confirmation)
  commande_recue: {
    fr: (p) =>
      `🛍️ *Commande confirmee*\n\n` +
      `Restaurant : ${p.restaurantNom}\n` +
      `Type : ${p.type === "retrait" ? "A emporter" : "Sur place"}\n` +
      (p.heure ? `Retrait souhaite : ${p.heure}\n` : "") +
      `Montant : ${p.montant}\n\n` +
      `Votre QR code :\n${p.qrCodeUrl}\n\n` +
      `Vous recevrez un message quand votre commande sera prete.`,
    en: (p) =>
      `🛍️ *Order confirmed*\n\n` +
      `Restaurant: ${p.restaurantNom}\n` +
      `Type: ${p.type === "retrait" ? "Takeaway" : "Dine-in"}\n` +
      (p.heure ? `Desired pickup: ${p.heure}\n` : "") +
      `Amount: ${p.montant}\n\n` +
      `Your QR code:\n${p.qrCodeUrl}\n\n` +
      `You will receive a message when your order is ready.`,
    es: (p) =>
      `🛍️ *Pedido confirmado*\n\n` +
      `Restaurante : ${p.restaurantNom}\n` +
      `Tipo : ${p.type === "retrait" ? "Para llevar" : "En el local"}\n` +
      (p.heure ? `Recogida deseada : ${p.heure}\n` : "") +
      `Monto : ${p.montant}\n\n` +
      `Tu codigo QR :\n${p.qrCodeUrl}\n\n` +
      `Recibiras un mensaje cuando tu pedido este listo.`,
    pt: (p) =>
      `🛍️ *Pedido confirmado*\n\n` +
      `Restaurante : ${p.restaurantNom}\n` +
      `Tipo : ${p.type === "retrait" ? "Para levar" : "No local"}\n` +
      (p.heure ? `Retirada desejada : ${p.heure}\n` : "") +
      `Valor : ${p.montant}\n\n` +
      `Seu QR code :\n${p.qrCodeUrl}\n\n` +
      `Voce recebera uma mensagem quando seu pedido estiver pronto.`,
  },

  // Commande prete
  commande_prete: {
    fr: (p) =>
      `🎉 *Votre commande est prete !*\n\n` +
      `Restaurant : ${p.restaurantNom}\n` +
      `Montant : ${p.montant}\n\n` +
      `Presentez votre QR code au retrait :\n${p.qrCodeUrl}`,
    en: (p) =>
      `🎉 *Your order is ready!*\n\n` +
      `Restaurant: ${p.restaurantNom}\n` +
      `Amount: ${p.montant}\n\n` +
      `Present your QR code for pickup:\n${p.qrCodeUrl}`,
    es: (p) =>
      `🎉 *Tu pedido esta listo!*\n\n` +
      `Restaurante : ${p.restaurantNom}\n` +
      `Monto : ${p.montant}\n\n` +
      `Presenta tu codigo QR al recoger :\n${p.qrCodeUrl}`,
    pt: (p) =>
      `🎉 *Seu pedido esta pronto!*\n\n` +
      `Restaurante : ${p.restaurantNom}\n` +
      `Valor : ${p.montant}\n\n` +
      `Apresente seu QR code na retirada :\n${p.qrCodeUrl}`,
  },

  // Relance no-show +30min
  relance_noshow: {
    fr: (p) =>
      `❌ *Reservation non honoree*\n\n` +
      `Votre reservation chez ${p.restaurantNom} du ${p.date} a ${p.heure} n'a pas ete annulee.\n\n` +
      `Si vous ne pouvez pas venir, merci d'annuler pour liberer la place.`,
    en: (p) =>
      `❌ *No-show notification*\n\n` +
      `Your reservation at ${p.restaurantNom} on ${p.date} at ${p.heure} was not cancelled.\n\n` +
      `If you cannot make it, please cancel to free the table.`,
    es: (p) =>
      `❌ *Reserva no honrada*\n\n` +
      `Tu reserva en ${p.restaurantNom} del ${p.date} a las ${p.heure} no fue cancelada.\n\n` +
      `Si no puedes venir, por favor cancela para liberar la mesa.`,
    pt: (p) =>
      `❌ *Reserva nao honrada*\n\n` +
      `Sua reserva em ${p.restaurantNom} no dia ${p.date} as ${p.heure} nao foi cancelada.\n\n` +
      `Se nao puder vir, por favor cancele para liberar a mesa.`,
  },
};

export function getTemplate(
  typeEvenement: string,
  langue: Langue,
  params: TemplateParams
): string {
  const template = templates[typeEvenement];
  if (!template) {
    throw new Error(`Template non trouve pour l'evenement: ${typeEvenement}`);
  }
  return template[langue](params);
}