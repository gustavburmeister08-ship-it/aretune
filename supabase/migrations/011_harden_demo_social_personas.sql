-- Repair the already-seeded production demo users so password-grant requests
-- fail cleanly instead of encountering nullable legacy auth fields. The random
-- source values are never persisted, so these personas still have no usable
-- credentials and no auth identities.

update auth.users
set
  encrypted_password = extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
  confirmation_token = '',
  recovery_token = '',
  email_change_token_new = '',
  email_change = '',
  updated_at = now()
where raw_app_meta_data ->> 'is_demo' = 'true'
  and raw_user_meta_data ->> 'demo_seed' = 'uebermensch-v1';
