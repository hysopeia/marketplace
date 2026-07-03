# marketplace

Squelette du SaaS ReservDine — réservation & pré-commande restaurant, multi-tenant, multi-pays, multilingue.
Voir `RESERVDINE_PROMPT_SAAS_COMPLET.md` (fourni séparément) pour la spécification complète.

## Ce qui est déjà en place dans ce squelette

- Structure Next.js 14 (App Router) + TypeScript
- i18n complet (FR/EN/ES/PT) via `next-intl`, 4 fichiers de traduction prêts
- Client Supabase (navigateur + serveur)
- Migration SQL complète avec RLS multi-tenant (`supabase/migrations/0001_init.sql`)
- Couche d'abstraction paiement (`PaymentProvider`) + adaptateur CinetPay + résolution par pays
- Génération QR code auto-hébergée avec logo (`qr-code-styling`, niveau H)

## Ce qu'il reste à construire (à faire toi-même ou via Claude Code ensuite)

- Les pages/composants UI (menu, formulaire réservation, dashboard staff)
- Les API routes (`src/app/api/...`) qui appellent la logique déjà posée dans `src/lib`
- L'intégration UltraMsg (notifications WhatsApp)
- Les workflows n8n (rappels, relances no-show)

---

## PROCESS ÉTAPE PAR ÉTAPE

### Étape 1 — Prérequis sur ta machine

```bash
node -v   # doit afficher v18 ou plus récent, sinon installe Node.js
git --version
```

### Étape 2 — Créer le dépôt GitHub

1. Va sur GitHub, crée un nouveau dépôt vide : `hysopeia/marketplace`
2. En local, dans un dossier de ton choix :

```bash
cd chemin/vers/tes/projets
# extrais le zip que je t'ai fourni ici, ou copie les fichiers un par un
cd marketplace
git init
git remote add origin https://github.com/hysopeia/marketplace.git
git add .
git commit -m "init: squelette ReservDine (i18n, supabase, paiement, qrcode)"
git branch -M main
git push -u origin main
```

### Étape 3 — Installer les dépendances

```bash
npm install
```

### Étape 4 — Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com) → crée un compte / connecte-toi
2. **New Project** → choisis une région (Europe de l'Ouest recommandé pour la latence CI)
3. Une fois créé : **Project Settings → API** → note `Project URL` et `anon public key`
4. **Project Settings → Database** → note la `Connection string` (mode "URI")

### Étape 5 — Exécuter le schéma SQL

1. Dans Supabase : **SQL Editor → New query**
2. Copie-colle tout le contenu de `supabase/migrations/0001_init.sql`
3. Clique **Run** → vérifie dans **Table Editor** que toutes les tables sont créées

### Étape 6 — Configurer les variables d'environnement

```bash
cp .env.example .env.local
```

Remplis `.env.local` avec :
- Les valeurs Supabase de l'étape 4
- Ta clé API CinetPay (dashboard CinetPay → section Intégration)
- Ton instance/token UltraMsg (le même compte que SecurEcole si tu veux centraliser, ou une nouvelle instance dédiée à ReservDine)

⚠️ Rappel du bug déjà rencontré sur School D'Abord : sur Windows, si Prisma ne lit pas `DATABASE_URL`/`DIRECT_URL` depuis `.env.local`, les définir manuellement dans le terminal avant `prisma migrate` :

```bash
set DATABASE_URL=postgresql://...
set DIRECT_URL=postgresql://...
```

### Étape 7 — Lancer en local

```bash
npm run dev
```

Ouvre `http://localhost:3000/fr` (ou `/en`, `/es`, `/pt`) — le serveur tourne en local, connecté à ta vraie base Supabase.

### Étape 8 — Construire les pages manquantes

C'est ici que tu bascules sur **Claude Code**, branché directement sur ce dépôt Git, pour :
- construire les pages `src/app/[locale]/[slug]/...` (vitrine resto, menu, réservation)
- construire le dashboard staff (`src/app/[locale]/dashboard/...`) avec Supabase Realtime
- brancher les API routes sur les libs déjà posées dans `src/lib`

Donne-lui simplement `RESERVDINE_PROMPT_SAAS_COMPLET.md` en contexte, il aura toute la spec.

### Étape 9 — Tester le paiement en sandbox

1. Dashboard CinetPay → active le mode Sandbox
2. Fais une réservation de test en local → vérifie que `paiements.statut` passe bien à `reussi` après paiement sandbox

### Étape 10 — Déployer sur Vercel

1. [vercel.com](https://vercel.com) → connecte-toi avec GitHub
2. **New Project** → sélectionne `hysopeia/marketplace`
3. Vercel détecte Next.js automatiquement, aucune config de build nécessaire
4. **Environment Variables** → colle exactement les mêmes variables que ton `.env.local`
5. **Deploy** → tu obtiens une URL `marketplace.vercel.app`

### Étape 11 — Domaine personnalisé (optionnel)

**Project Settings → Domains** → ajoute `reservdine.app` (ou le nom choisi) → configure les DNS chez ton registrar selon les instructions Vercel.

### Étape 12 — CI/CD automatique

À partir de maintenant, chaque `git push origin main` redéploie automatiquement sur Vercel — même flux que School D'Abord.

---

## Rappel des contraintes de qualité (à respecter dans toute évolution future)

- Aucun texte en dur dans les composants — tout via les fichiers `messages/*.json`
- Aucun appel direct à un SDK de paiement — toujours via `getProviderForCountry()`
- RLS Supabase activé sur toute nouvelle table contenant des données par restaurant
- QR codes générés et stockés côté serveur, jamais régénérés à chaque affichage
