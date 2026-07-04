Lis d'abord entièrement le fichier RESERVDINE_PROMPT_SAAS_COMPLET.md à la racine
du projet — c'est la spécification complète et définitive du SaaS que tu vas construire.

Le squelette du projet est déjà en place : structure Next.js 14 App Router, i18n
(next-intl, 4 langues FR/EN/ES/PT), clients Supabase (navigateur + serveur), couche
d'abstraction PaymentProvider avec adaptateur CinetPay, génération QR code auto-hébergée
avec logo, et le schéma SQL complet déjà exécuté sur mon instance Supabase en production
(toutes les tables existent avec RLS activé).

Le fichier .env.local est déjà rempli avec mes vraies clés Supabase et fonctionne
en local (npm run dev démarre sans erreur).

Commence par la Phase 1 du prompt maître (section 12) : MVP mono-restaurant,
Côte d'Ivoire, tier Business. Dans l'ordre :

1. Construis la page vitrine publique d'un restaurant : src/app/[locale]/[slug]/page.tsx
   — affichage du menu (catégories + plats depuis Supabase), sélecteur de langue,
   bouton réservation et bouton pré-commande.

2. Construis le formulaire de réservation (date, heure, nombre de personnes,
   vérification de capacité via creneaux_capacite, écriture dans reservations).

3. Construis le flux de pré-commande (panier, sélection heure de retrait,
   écriture dans commandes + commande_items).

4. Branche le paiement via getProviderForCountry() déjà présent dans
   src/lib/payments/ — utilise le mode sandbox CinetPay.

5. Branche la génération QR (src/lib/qrcode/generate.ts) à la confirmation
   de réservation/commande, stockage dans Supabase Storage.

6. Construis le dashboard staff basique (src/app/[locale]/dashboard/...)
   avec Supabase Realtime pour voir les commandes/réservations arriver en direct.

Respecte strictement les contraintes de qualité de la section 13 du prompt maître :
aucun texte en dur (tout via next-intl), aucun appel direct à un SDK de paiement,
RLS sur toute nouvelle table, QR généré côté serveur uniquement.

Avant de commencer à coder, dis-moi ton plan détaillé étape par étape et
demande-moi confirmation.