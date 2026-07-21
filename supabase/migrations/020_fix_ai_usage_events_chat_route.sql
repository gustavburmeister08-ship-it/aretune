-- Bugfix: migration 018 (ai_chat) added 'chat' as a valid ai_usage_events.route
-- value in types/database.ts but never updated the actual database check
-- constraint, so every chat reply failed at the usage-recording step with
-- "Unable to record AI usage" even though the reply itself was generated
-- successfully.

alter table public.ai_usage_events drop constraint ai_usage_events_route_check;
alter table public.ai_usage_events add constraint ai_usage_events_route_check
  check (route in ('directive', 'audit', 'chat'));
