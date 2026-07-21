-- Column-level REVOKE (migrations 016, 021) does not reliably hold on this
-- Supabase project — verified live 2026-07-21: a real signed-in client
-- successfully overwrote both pillar_scores and subscription_tier via a
-- direct REST PATCH despite both REVOKE statements being applied. Cause is
-- almost certainly Supabase's own periodic grant reconciliation re-adding
-- broad column privileges to anon/authenticated after each schema change.
-- Trigger-based enforcement does not depend on GRANT state at all, so it is
-- the actually-effective layer here; the REVOKE statements stay in place as
-- harmless defense-in-depth.
--
-- current_user (not auth.role()) is the correct check: inside a SECURITY
-- DEFINER function (set_pillar_scores, persist_score_snapshots) it switches
-- to the function owner for the duration of the call, while auth.role()
-- would still report the original caller's 'authenticated' role and wrongly
-- block those legitimate paths. A direct PostgREST request as anon/
-- authenticated keeps current_user as anon/authenticated; the Stripe
-- webhook's service-role requests have current_user = 'service_role'.

create or replace function public.protect_privileged_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if new.pillar_scores is distinct from old.pillar_scores then
    raise exception 'pillar_scores can only be changed via set_pillar_scores()/persist_score_snapshots()';
  end if;

  if new.subscription_tier is distinct from old.subscription_tier
    or new.founding_member is distinct from old.founding_member
    or new.stripe_customer_id is distinct from old.stripe_customer_id
    or new.stripe_subscription_id is distinct from old.stripe_subscription_id
    or new.subscription_plan is distinct from old.subscription_plan
    or new.subscription_status is distinct from old.subscription_status
    or new.subscription_current_period_end is distinct from old.subscription_current_period_end
  then
    raise exception 'billing fields can only be changed by the Stripe webhook';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_privileged_columns on public.profiles;
create trigger profiles_protect_privileged_columns
before update on public.profiles
for each row execute function public.protect_privileged_profile_columns();
