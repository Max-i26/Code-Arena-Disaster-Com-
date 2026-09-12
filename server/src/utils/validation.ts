/**
 * Validation utilities for ResQCity system
 */

// Sri Lankan NIC Format:
// Old format: 9 digits followed by V or X (case-insensitive) -> e.g. 199483720V or 941234567v (10 chars total)
// New format: 12 digits -> e.g. 199483720191 or 200012345678 (12 chars total)
export const SRI_LANKA_NIC_REGEX = /^([0-9]{9}[vVxX]|[0-9]{12})$/;

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Phone: Sri Lankan (+94 XX XXX XXXX or 0XX XXX XXXX) or general international format (9 to 15 digits)
export const GENERAL_PHONE_REGEX = /^\+?[\d\s\-()]{9,18}$/;

// Username: 3 to 30 characters, alphanumeric and underscore only
export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateNicFormat(nic: string | undefined | null): ValidationResult {
  if (!nic || !nic.trim()) {
    return { valid: false, error: 'NIC (National Identity Card) Number is required.' };
  }
  const cleanNic = nic.trim();
  if (!SRI_LANKA_NIC_REGEX.test(cleanNic)) {
    return {
      valid: false,
      error: `Invalid NIC format: "${cleanNic}". NIC must be either 9 digits followed by 'V' or 'X' (e.g. 199483720V) or 12 digits (e.g. 199483720191).`
    };
  }
  return { valid: true };
}

export function validateEmail(email: string | undefined | null): ValidationResult {
  if (!email || !email.trim()) {
    return { valid: false, error: 'Email address is required.' };
  }
  const cleanEmail = email.trim();
  if (!EMAIL_REGEX.test(cleanEmail)) {
    return { valid: false, error: `Invalid email format: "${cleanEmail}". Please enter a valid email address (e.g. user@example.com).` };
  }
  return { valid: true };
}

export function validatePhone(phone: string | undefined | null): ValidationResult {
  if (!phone || !phone.trim()) {
    return { valid: false, error: 'Contact phone number is required.' };
  }
  const cleanPhone = phone.trim();
  const digitsOnly = cleanPhone.replace(/\D/g, '');
  if (digitsOnly.length < 9 || digitsOnly.length > 15 || !GENERAL_PHONE_REGEX.test(cleanPhone)) {
    return {
      valid: false,
      error: `Invalid phone number: "${cleanPhone}". Please enter a valid phone number (at least 9 digits).`
    };
  }
  return { valid: true };
}

export function validateUsername(username: string | undefined | null): ValidationResult {
  if (!username || !username.trim()) {
    return { valid: false, error: 'Username is required.' };
  }
  const cleanUser = username.trim();
  if (cleanUser.length < 3 || cleanUser.length > 30) {
    return { valid: false, error: 'Username must be between 3 and 30 characters in length.' };
  }
  if (!USERNAME_REGEX.test(cleanUser)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores (no spaces or special symbols).' };
  }
  return { valid: true };
}

export function validatePassword(password: string | undefined | null): ValidationResult {
  if (!password) {
    return { valid: false, error: 'Password is required.' };
  }
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters in length.' };
  }
  return { valid: true };
}

export function validateFullName(name: string | undefined | null): ValidationResult {
  if (!name || !name.trim()) {
    return { valid: false, error: 'Full Name is required.' };
  }
  if (name.trim().length < 2) {
    return { valid: false, error: 'Full Name must be at least 2 characters.' };
  }
  return { valid: true };
}
