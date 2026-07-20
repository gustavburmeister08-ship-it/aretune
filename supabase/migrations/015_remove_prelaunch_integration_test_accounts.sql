-- Remove temporary accounts created by the production integration/RLS smoke test.
delete from auth.users where email like 'integration-e2e-%@example.com';
