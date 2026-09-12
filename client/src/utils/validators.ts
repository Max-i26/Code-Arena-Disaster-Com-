/**
 * Client-Side Validation Utilities for ResQCity Portal
 */

// Sri Lankan NIC Format:
// Old format: 9 digits followed by V or X (case-insensitive) -> e.g. 199483720V or 941234567v (10 chars total)
// New format: 12 digits -> e.g. 199483720191 or 200012345678 (12 chars total)
export const SRI_LANKA_NIC_REGEX = /^([0-9]{9}[vVxX]|[0-9]{12})$/;

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const GENERAL_PHONE_REGEX = /^\+?[\d\s\-()]{9,18}$/;

export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateNic(nic: string | undefined | null): ValidationResult {
  if (!nic || !nic.trim()) {
    return { valid: false, error: 'NIC (National Identity Card) number is required.' };
  }
  const clean = nic.trim();
  if (!SRI_LANKA_NIC_REGEX.test(clean)) {
    return {
      valid: false,
      error: `Invalid NIC format: "${clean}". NIC must be 9 digits followed by 'V' or 'X' (e.g. 199483720V) or 12 digits (e.g. 199483720191).`
    };
  }
  return { valid: true };
}

export function validateEmail(email: string | undefined | null): ValidationResult {
  if (!email || !email.trim()) {
    return { valid: true }; // Email is optional for some roles unless provided
  }
  const clean = email.trim();
  if (!EMAIL_REGEX.test(clean)) {
    return { valid: false, error: `Invalid email address format: "${clean}".` };
  }
  return { valid: true };
}

export function validatePhone(phone: string | undefined | null): ValidationResult {
  if (!phone || !phone.trim()) {
    return { valid: false, error: 'Contact phone number is required.' };
  }
  const clean = phone.trim();
  const digitsOnly = clean.replace(/\D/g, '');
  if (digitsOnly.length < 9 || digitsOnly.length > 15 || !GENERAL_PHONE_REGEX.test(clean)) {
    return {
      valid: false,
      error: `Invalid phone number: "${clean}". Please enter a valid telephone number (at least 9 digits).`
    };
  }
  return { valid: true };
}

export function validateUsername(username: string | undefined | null): ValidationResult {
  if (!username || !username.trim()) {
    return { valid: false, error: 'Username is required.' };
  }
  const clean = username.trim();
  if (clean.length < 3 || clean.length > 30) {
    return { valid: false, error: 'Username must be between 3 and 30 characters in length.' };
  }
  if (!USERNAME_REGEX.test(clean)) {
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
