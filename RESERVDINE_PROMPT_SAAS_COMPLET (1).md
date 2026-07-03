# PROMPT DE CRÉATION SAAS — RESERVDINE
## Plateforme de réservation & pré-commande restaurant (sans livraison), multi-tenant, multi-pays, multilingue

---

## 0. CONTEXTE POUR CLAUDE CODE

Tu vas construire **ReservDine**, un SaaS pour restaurants permettant :
- la **réservation de table** avec gestion de créneaux/capacité,
- la **pré-commande à emporter** (retrait sur place, sans livreur),
- le **paiement en ligne** (mobile money, cartes) via un système multi-provider,
- une **architecture multi-tenant** (plusieurs restaurants sur une même plateforme),
- une **couverture multi-pays et multilingue dès le départ** (architecture "global-ready"), même si le lancement commercial est mono-pays (Côte d'Ivoire).

Ce document est la spécification complète et définitive. Ne pas improviser d'architecture alternative sans le signaler explicitement. Construire dans l'ordre des phases indiquées en section 12.

---

## 1. STACK TECHNIQUE IMPOSÉE

| Couche | Techno | Justification |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Cohérence avec School D'Abord |
| Backend/DB | Supabase (Postgres + Auth + Realtime + Storage) | RLS natif, Realtime pour dashboard cuisine, cohérence avec l'écosystème existant |
| Paiement | Architecture multi-provider (voir section 6) — CinetPay en provider par défaut zone UEMOA/CEMAC | Déjà intégré dans l'écosystème (ImmoCi Manager, HYSOPE CARE) |
| Notifications | WhatsApp via UltraMsg API | Instance déjà en production sur SecurEcole (`prefixPays: '225'`), pattern réutilisable |
| Automatisation | n8n | Rappels programmés, relances no-show, reporting hebdomadaire |
| QR Code | `qr-code-styling` (npm), génération serveur, niveau correction erreur H | Auto-hébergé, logo intégré, zéro dépendance SaaS tierce (voir section 8) |
| i18n | next-intl | FR / EN / ES / PT dès le MVP |
| Hébergement | Vercel (frontend) + Supabase Cloud (backend) | Pattern identique à School D'Abord |
| Géolocalisation | API navigateur (Geolocation API) + fallback IP (ex: ipapi.co) | Détection pays/langue, recherche "près de moi" |

**Contrainte non négociable :** ne jamais coder un provider de paiement "en dur". Toujours passer par la couche d'abstraction `PaymentProvider` décrite en section 6.

---

## 2. ARCHITECTURE MULTI-TENANT

- Isolation des données par `restaurant_id` sur **toutes** les tables métier via **Row Level Security (RLS) Supabase**.
- Chaque restaurant a un slug unique : `reservdine.app/{pays}/{slug-restaurant}`.
- Un compte "Groupe/Franchise" (tier 3, voir section 4) peut posséder plusieurs `restaurant_id` rattachés à un `groupe_id` parent, avec un dashboard consolidé.
- Rôles applicatifs : `super_admin` (toi), `owner` (propriétaire resto), `manager`, `staff`, `client`.

---

## 3. INTERNATIONALISATION (i18n) — OBLIGATOIRE DÈS LE MVP

- Langues : **français, anglais, espagnol, portugais**.
- Librairie : `next-intl`, fichiers `messages/fr.json`, `en.json`, `es.json`, `pt.json`.
- Détection automatique de la langue à l'arrivée via géolocalisation IP, avec sélecteur manuel visible en permanence dans le header.
- **Ne jamais coder de texte en dur dans les composants** — tout passe par les clés de traduction, y compris les emails/notifications WhatsApp (templates par langue).
- Contenu dynamique traduisible (noms de plats, descriptions de menu) : ne PAS créer de colonnes `nom_fr`, `nom_en`, etc. Utiliser une table pivot :

```sql
create table traductions (
  id uuid primary key default gen_random_uuid(),
  entite_type text not null, -- 'menu_item', 'restaurant', 'categorie'
  entite_id uuid not null,
  langue text not null check (langue in ('fr','en','es','pt')),
  champ text not null, -- 'nom', 'description'
  valeur text not null,
  unique (entite_type, entite_id, langue, champ)
);
```

- Répartition cible par langue (pour le go-to-market, informatif) :
  - FR → Côte d'Ivoire, Sénégal, Mali, Cameroun, RDC
  - EN → Ghana, Nigeria, Kenya
  - PT → Angola, Mozambique, Guinée-Bissau, Cap-Vert
  - ES → Guinée équatoriale, diaspora hispanophone

---

## 4. TIERS FONCTIONNELS (selon taille du restaurant)

Construire le système de permissions/feature-flags pour que ces 3 tiers soient activables par `restaurant_id.tier` sans duplication de code.

### Tier STARTER (food-truck, kiosque, resto 1 salle)
- Menu digital
- Pré-commande simple (1 créneau horaire de retrait)
- Paiement mobile money
- 1 QR code de retrait

### Tier BUSINESS (resto établi, plusieurs services/jour)
- Tout Starter +
- Gestion de tables et capacité par créneau
- Réservation avec acompte optionnel
- Dashboard staff (Realtime Supabase)
- Statistiques de fréquentation
- Liste d'attente automatique si complet

### Tier GROUPE/FRANCHISE (chaîne multi-sites)
- Tout Business +
- Multi-établissements sous un même compte (`groupe_id`)
- Dashboard consolidé multi-sites
- Gestion centralisée du menu avec déclinaisons par site (prix/dispo par `restaurant_id`)
- Reporting comparatif inter-sites
- Sélection automatique du site le plus proche du client (géolocalisation)

---

## 5. SCHÉMA DE DONNÉES COMPLET

```sql
-- Groupes / franchises (optionnel, null si resto indépendant)
create table groupes (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  created_at timestamptz default now()
);

create table restaurants (
  id uuid primary key default gen_random_uuid(),
  groupe_id uuid references groupes(id),
  nom text not null,
  slug text unique not null,
  pays text not null, -- code ISO (CI, SN, GH, NG...)
  ville text,
  quartier text,
  adresse text,
  latitude double precision,
  longitude double precision,
  telephone text,
  logo_url text,
  tier text not null check (tier in ('starter','business','groupe')) default 'starter',
  devise text not null default 'XOF',
  statut_abonnement text default 'actif',
  created_at timestamptz default now()
);

create table utilisateurs_restaurant (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id),
  user_id uuid references auth.users(id),
  role text check (role in ('owner','manager','staff')),
  created_at timestamptz default now()
);

create table categories_menu (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id),
  ordre int default 0
);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id),
  categorie_id uuid references categories_menu(id),
  prix numeric(12,2) not null,
  photo_url text,
  disponible boolean default true,
  created_at timestamptz default now()
);

create table creneaux_capacite (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id),
  jour_semaine int, -- 0-6
  heure_debut time,
  heure_fin time,
  capacite_totale int not null
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  nom text,
  telephone text unique,
  email text,
  langue_preferee text default 'fr',
  created_at timestamptz default now()
);

create table reservations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id),
  client_id uuid references clients(id),
  date_reservation date not null,
  heure time not null,
  nb_personnes int not null,
  statut text check (statut in ('en_attente','confirmee','arrivee','annulee','no_show')) default 'en_attente',
  acompte_montant numeric(12,2) default 0,
  acompte_statut text default 'non_requis',
  qr_code_url text,
  created_at timestamptz default now()
);

create table commandes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id),
  client_id uuid references clients(id),
  type text check (type in ('retrait','sur_place')) default 'retrait',
  heure_retrait_souhaitee timestamptz,
  statut text check (statut in ('recue','en_preparation','prete','recuperee','annulee')) default 'recue',
  montant_total numeric(12,2) not null,
  devise text default 'XOF',
  qr_code_url text,
  created_at timestamptz default now()
);

create table commande_items (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid references commandes(id),
  menu_item_id uuid references menu_items(id),
  quantite int not null,
  prix_unitaire numeric(12,2) not null
);

create table paiements (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid references commandes(id),
  reservation_id uuid references reservations(id),
  montant numeric(12,2) not null,
  devise text not null,
  provider text not null, -- 'cinetpay', 'paystack', 'flutterwave', 'elyonpay'
  reference_externe text,
  statut text check (statut in ('en_attente','reussi','echoue','rembourse')) default 'en_attente',
  created_at timestamptz default now()
);

create table traductions (
  id uuid primary key default gen_random_uuid(),
  entite_type text not null,
  entite_id uuid not null,
  langue text not null check (langue in ('fr','en','es','pt')),
  champ text not null,
  valeur text not null,
  unique (entite_type, entite_id, langue, champ)
);
```

**RLS obligatoire** sur `reservations`, `commandes`, `menu_items`, `utilisateurs_restaurant` : un utilisateur ne voit que les lignes de son/ses `restaurant_id` (ou de son `groupe_id` pour le tier Groupe).

---

## 6. COUCHE D'ABSTRACTION PAIEMENT (multi-provider, multi-pays)

Ne jamais appeler un SDK de paiement directement depuis les composants. Créer une interface unique :

```typescript
interface PaymentProvider {
  initierPaiement(params: {
    montant: number;
    devise: string;
    pays: string;
    reference: string;
    callbackUrl: string;
  }): Promise<{ paymentUrl: string; transactionId: string }>;

  verifierPaiement(transactionId: string): Promise<'reussi' | 'echoue' | 'en_attente'>;
}
```

**Résolution du provider par pays** (fonction `getProviderForCountry(pays: string)`) :
- Zone UEMOA/CEMAC (CI, SN, ML, CM, etc.) → **CinetPay** (Wave, Orange Money, MTN Money, cartes)
- Nigeria, Ghana → **Paystack** ou **Flutterwave** (à intégrer en phase 3, adaptateur à créer sur le même modèle)
- Diaspora / paiement transfrontalier → **ElyonPay** en option (à évaluer, non prioritaire en phase 1)

Chaque provider = un fichier `lib/payments/providers/{provider}.ts` implémentant l'interface `PaymentProvider`. Le choix du provider ne doit jamais être codé en dur dans les pages, uniquement via la fonction de résolution par pays.

---

## 7. NOTIFICATIONS WHATSAPP (UltraMsg)

Réutiliser le pattern déjà en production sur SecurEcole (instance171568, `prefixPays: '225'`), généralisé pour être multi-pays (préfixe dynamique selon `restaurant.pays`).

Événements déclenchant une notification :
- Confirmation de réservation/commande (immédiat)
- Rappel de réservation (-1h, via n8n)
- "Votre commande est prête" (déclenché par le staff depuis le dashboard)
- Relance no-show (via n8n, +30min après l'heure de réservation si statut toujours `en_attente`)

Templates de message **traduits par langue du client** (`clients.langue_preferee`), stockés en base ou en fichiers JSON par langue — jamais de texte en dur dans le code d'envoi.

---

## 8. QR CODE — GÉNÉRATION AUTO-HÉBERGÉE

- Librairie : `qr-code-styling`, génération **côté serveur** (API route Next.js) au moment de la confirmation.
- Niveau de correction d'erreur : **H (30%)** obligatoire pour permettre l'insertion du logo du restaurant sans casser la lisibilité.
- Le QR encode uniquement une URL stable interne : `reservdine.app/r/{reservation_id}` ou `/c/{commande_id}` — jamais de données sensibles encodées directement (pas de "QR dynamique" payant nécessaire, le contenu change côté base de données, pas côté QR).
- Stockage du QR généré dans Supabase Storage, URL sauvegardée dans `reservations.qr_code_url` / `commandes.qr_code_url`.
- Logo dynamique = `restaurants.logo_url`, injecté au centre du QR à la génération.
- Export SVG pour tout affichage destiné à l'impression (tickets, affiches table).

---

## 9. GÉOLOCALISATION

Cas d'usage à implémenter :
1. **Recherche "restaurants près de moi"** — rayon ajustable, tri par distance (formule Haversine ou extension PostGIS Supabase si volume important).
2. **Détection pays/langue** à l'arrivée sur le site (IP fallback si géoloc navigateur refusée).
3. **Sélection automatique du site le plus proche** pour les comptes Groupe/Franchise.
4. **Résolution automatique du provider de paiement** selon le pays détecté (voir section 6).
5. **Dashboard restaurateur** : carte de chaleur d'origine géographique des clients (analytics, phase 3).

---

## 10. FLUX UTILISATEURS DÉTAILLÉS

### Réservation de table
1. Client choisit resto (recherche géoloc ou lien direct) → date/heure → nombre de personnes
2. Vérification disponibilité via `creneaux_capacite` (anti-surbooking)
3. Acompte optionnel (paramétrable par `restaurant_id`)
4. Paiement via provider résolu par pays
5. Génération QR + confirmation WhatsApp dans la langue du client + rappel -1h (n8n)
6. Staff scanne le QR à l'arrivée → statut `arrivee`

### Pré-commande à emporter
1. Client parcourt le menu digital (traduit dans sa langue)
2. Sélection plats + heure de retrait souhaitée
3. Paiement immédiat ou "payer sur place" (paramétrable par restaurant)
4. Dashboard cuisine reçoit la commande en Realtime (Supabase Realtime, pas de polling)
5. Staff met à jour le statut (`en_preparation` → `prete`) → notification WhatsApp automatique
6. Client scanne son QR au retrait → statut `recuperee`

---

## 11. MODÈLE ÉCONOMIQUE

- **Abonnement SaaS mensuel** par tier :
  - Starter : 10 000 – 15 000 FCFA/mois
  - Business : 20 000 – 35 000 FCFA/mois
  - Groupe/Franchise : sur devis (base + par site additionnel)
- **Commission à la transaction** sur les paiements en ligne uniquement (2–4%), aucune commission sur les réservations simples ou le paiement sur place.
- Différenciateur commercial explicite face à Glovo/Jumia Food/Uber Eats/Yango Deli : **pas de commission de livraison (20–30%)**, le restaurant garde son propre mode de service.

---

## 12. PHASES DE CONSTRUCTION (ordre impératif)

### Phase 0 — Fondations globales (à construire même si non utilisées immédiatement)
- Architecture i18n complète (4 langues)
- Schéma DB complet avec RLS multi-tenant
- Couche d'abstraction `PaymentProvider` (même si un seul provider branché au départ)
- Génération QR auto-hébergée avec logo

### Phase 1 — MVP mono-resto (Côte d'Ivoire, tier Business)
- Un seul restaurant pilote
- Menu digital + réservation + pré-commande + paiement CinetPay
- Notifications WhatsApp (confirmation + rappel)
- Dashboard staff Realtime

### Phase 2 — Multi-tenant SaaS (Côte d'Ivoire)
- Dashboard Super Admin (onboarding restos en autonomie)
- Activation des 3 tiers (Starter / Business / Groupe)
- Facturation SaaS

### Phase 3 — Expansion pays test (Sénégal, francophone, zone CinetPay)
- Validation que l'architecture multi-pays tient réellement (devise, pays, i18n déjà prêts en Phase 0)
- Ajout adaptateur Paystack/Flutterwave si un pays anglophone est visé ensuite

### Phase 4 — Ouverture zones anglophone/lusophone
- Activation complète EN/PT dans le go-to-market
- Ajout provider(s) de paiement additionnels selon couverture géographique réelle

---

## 13. CONTRAINTES DE QUALITÉ POUR CLAUDE CODE

- Aucun texte en dur dans les composants — tout via i18n.
- Aucun appel direct à un SDK de paiement — toujours via `PaymentProvider`.
- RLS Supabase activé et testé sur toutes les tables contenant des données par restaurant.
- Dashboard staff en Supabase Realtime, pas de polling HTTP.
- QR codes générés et stockés côté serveur, jamais générés à la volée côté client à chaque affichage.
- Code organisé pour permettre l'ajout d'un tier ou d'un pays sans réécriture — feature flags par `tier`, résolution de provider par `pays`, traductions par table pivot.
