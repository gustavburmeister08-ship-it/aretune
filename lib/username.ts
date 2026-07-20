import { supabase } from './supabase';
import { normalizeUsernameInput, usernameValidationError } from './username-rules';

export { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH, normalizeUsernameInput, usernameValidationError } from './username-rules';

export async function isUsernameAvailable(value: string) {
  const username = normalizeUsernameInput(value);
  if (usernameValidationError(username)) return false;
  const { data, error } = await supabase.rpc('is_username_available', { p_username: username });
  if (error) throw error;
  return Boolean(data);
}

export async function claimUsername(value: string) {
  const username = normalizeUsernameInput(value);
  const validationError = usernameValidationError(username);
  if (validationError) throw new Error(validationError);
  const { data, error } = await supabase.rpc('set_username', { p_username: username });
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes('taken') || message.includes('duplicate') || error.code === '23505') {
      throw new Error('This username is already taken.');
    }
    throw error;
  }
  return data;
}
