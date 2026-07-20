export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

export function normalizeUsernameInput(value: string) {
  return value
    .trim()
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9._]/g, '')
    .slice(0, USERNAME_MAX_LENGTH);
}

export function usernameValidationError(value: string): string | undefined {
  const username = normalizeUsernameInput(value);
  if (username.length < USERNAME_MIN_LENGTH) return `Use at least ${USERNAME_MIN_LENGTH} characters.`;
  if (username.length > USERNAME_MAX_LENGTH) return `Use no more than ${USERNAME_MAX_LENGTH} characters.`;
  if (!/^[a-z0-9_]/.test(username) || !/[a-z0-9_]$/.test(username)) return 'Start and end with a letter, number or underscore.';
  if (username.includes('..')) return 'Consecutive periods are not allowed.';
  if (!/^[a-z0-9._]+$/.test(username)) return 'Use only letters, numbers, periods and underscores.';
  return undefined;
}
