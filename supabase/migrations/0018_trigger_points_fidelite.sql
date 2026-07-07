-- =========================================================
-- MIGRATION 0018 — Attribution automatique des points fidelite
--
-- Un declencheur SQL est plus fiable qu'une logique dispersee dans le
-- code JS : peu importe QUI marque une commande "recuperee" (le
-- personnel dans le dashboard, le webhook de paiement, ou le mode
-- caisse), les points sont attribues au meme endroit, une seule fois.
-- =========================================================

create or replace function attribuer_points_fidelite()
returns trigger as $$
declare
  config record;
  points_a_ajouter int;
begin
  -- Ne rien faire si le statut ne vient pas de PASSER a 'recuperee'
  -- (evite d'attribuer les points plusieurs fois si le statut est
  -- resauvegarde sans changement, ou si la commande etait deja recuperee)
  if new.statut != 'recuperee' or old.statut = 'recuperee' then
    return new;
  end if;

  if new.client_id is null then
    return new;
  end if;

  select * into config
  from programme_fidelite
  where restaurant_id = new.restaurant_id and actif = true;

  if not found then
    return new;
  end if;

  points_a_ajouter := floor(new.montant_total * config.points_par_fcfa);

  if points_a_ajouter <= 0 then
    return new;
  end if;

  insert into points_fidelite_clients (restaurant_id, client_id, points_actuels, points_cumules_total)
  values (new.restaurant_id, new.client_id, points_a_ajouter, points_a_ajouter)
  on conflict (restaurant_id, client_id)
  do update set
    points_actuels = points_fidelite_clients.points_actuels + points_a_ajouter,
    points_cumules_total = points_fidelite_clients.points_cumules_total + points_a_ajouter;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trigger_points_fidelite on commandes;
create trigger trigger_points_fidelite
  after update on commandes
  for each row
  execute function attribuer_points_fidelite();

select 'Migration 0018 appliquee' as resultat;
