-- pgcrypto is installed in Supabase's extensions schema. Keep the restricted
-- search path explicit while making digest() available to the import RPC.
alter function public.ingest_integration_events(text, text, text, jsonb, text)
  set search_path = public, extensions;
