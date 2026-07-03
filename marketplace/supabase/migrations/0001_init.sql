-- =========================================================
-- RESERVDINE — MIGRATION INITIALE
-- À exécuter dans Supabase SQL Editor (Project > SQL Editor > New query)
-- =========================================================

create extension if not exists "pgcrypto";

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
  pays text not null,
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
  restaurant_id uuid references restaurants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text check (role in ('owner','manager','staff')),
  created_at timestamptz default now()
);

create table categories_menu (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  ordre int default 0
);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  categorie_id uuid references categories_menu(id),
  prix numeric(12,2) not null,
  photo_url text,
  disponible boolean default true,
  created_at timestamptz default now()
);

create table creneaux_capacite (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  jour_semaine int,
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
  restaurant_id uuid references restaurants(id) on delete cascade,
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
  restaurant_id uuid references restaurants(id) on delete cascade,
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
  commande_id uuid references commandes(id) on delete cascade,
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
  provider text not null,
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

-- =========================================================
-- ROW LEVEL SECURITY — isolation multi-tenant par restaurant_id
-- =========================================================

alter table restaurants enable row level security;
alter table utilisateurs_restaurant enable row level security;
alter table menu_items enable row level security;
alter table categories_menu enable row level security;
alter table creneaux_capacite enable row level security;
alter table reservations enable row level security;
alter table commandes enable row level security;
alter table commande_items enable row level security;
alter table paiements enable row level security;

-- Lecture publique du menu et des restaurants (nécessaire pour la vitrine publique)
create policy "Lecture publique restaurants" on restaurants
  for select using (true);

create policy "Lecture publique menu" on menu_items
  for select using (true);

create policy "Lecture publique categories" on categories_menu
  for select using (true);

-- Un membre du staff ne voit/modifie que les données de SON restaurant
create policy "Staff voit son restaurant" on utilisateurs_restaurant
  for select using (auth.uid() = user_id);

create policy "Staff gere reservations de son restaurant" on reservations
  for all using (
    restaurant_id in (
      select restaurant_id from utilisateurs_restaurant where user_id = auth.uid()
    )
  );

create policy "Staff gere commandes de son restaurant" on commandes
  for all using (
    restaurant_id in (
      select restaurant_id from utilisateurs_restaurant where user_id = auth.uid()
    )
  );

create policy "Staff gere menu de son restaurant" on menu_items
  for insert with check (
    restaurant_id in (
      select restaurant_id from utilisateurs_restaurant where user_id = auth.uid()
    )
  );

create policy "Staff modifie menu de son restaurant" on menu_items
  for update using (
    restaurant_id in (
      select restaurant_id from utilisateurs_restaurant where user_id = auth.uid()
    )
  );

-- NOTE : policies additionnelles (delete, tier Groupe multi-sites via groupe_id)
-- à affiner en Phase 2 selon les rôles owner/manager/staff.
