-- Phase 4 (Monetarisierung): Stripe subscription fields + founding-member
-- badge for the first 100 signups. subscription_tier already existed as a
-- decorative field written directly by the client (onboarding.tsx); once it
-- gates real AI budget it becomes a real privilege boundary, so lock all
-- billing columns down to service-role writes only (Stripe webhook), same
-- pattern as migration 016's set_pillar_scores hardening.

alter table public.profiles
  add column if not exists founding_member boolean not null default false,
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_plan text
    check (subscription_plan is null or subscription_plan in ('weekly', 'monthly', 'annual')),
  add column if not exists subscription_status text
    check (subscription_status is null or subscription_status in
      ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused')),
  add column if not exists subscription_current_period_end timestamptz;

revoke update (
  subscription_tier, founding_member, stripe_customer_id, stripe_subscription_id,
  subscription_plan, subscription_status, subscription_current_period_end
) on public.profiles from authenticated, anon;

-- First 100 signups get a permanent founding-member badge, independent of
-- which (if any) plan they choose. The advisory lock serializes concurrent
-- signups so the count check can't race past 100.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_is_founding boolean;
begin
  perform pg_advisory_xact_lock(hashtext('aretune_founding_member_counter'));
  select count(*) < 100 into v_is_founding from public.profiles;
  insert into public.profiles (id, email, founding_member)
  values (new.id, new.email, v_is_founding);
  return new;
end;
$$ language plpgsql security definer;
