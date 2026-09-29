/**
 * Cryptographic helper module for Administrator Password management
 * Uses Web Crypto API for secure PBKDF2 / SHA-256 password hashing and verification.
 * Storing plaintext passwords is strictly forbidden.
 */

// Helper to convert ArrayBuffer to Hex string
export function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper to convert Hex string to Uint8Array
export function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Get the Web Crypto implementation across browser and Node.js test environments
 */
export function getCrypto(): Crypto {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto;
  }
  throw new Error('Web Crypto API is not available in the current environment.');
}

/**
 * Generate a cryptographically secure 16-byte random salt
 */
export function generateSalt(): string {
  const cryptoObj = getCrypto();
  const saltBytes = new Uint8Array(16);
  cryptoObj.getRandomValues(saltBytes);
  return bufferToHex(saltBytes.buffer);
}

/**
 * Hash a password using PBKDF2 with SHA-256 (100,000 iterations)
 */
export async function hashPassword(password: string, salt?: string): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  const actualSalt = salt || generateSalt();
  const cryptoObj = getCrypto();
  const encoder = new TextEncoder();
  const passwordKey = await cryptoObj.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await cryptoObj.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(actualSalt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    256 // 256 bits = 32 bytes
  );

  return bufferToHex(derivedBits);
}

/**
 * Generate full password hash record with salt and iteration metadata
 */
export async function createPasswordRecord(password: string, customSalt?: string): Promise<{
  passwordHash: string;
  salt: string;
  iterations: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}> {
  const salt = customSalt || generateSalt();
  const passwordHash = await hashPassword(password, salt);
  const now = new Date().toISOString();
  return {
    passwordHash,
    salt,
    iterations: 100000,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Verify an input password against the stored cryptographic hash and salt
 */
export async function verifyPassword(
  inputPassword: string,
  storedHash: string,
  storedSalt: string,
  _iterations?: number
): Promise<boolean> {
  if (!inputPassword || !storedHash || !storedSalt) {
    return false;
  }

  try {
    const computedHash = await hashPassword(inputPassword, storedSalt);
    // Constant-time length comparison check
    if (computedHash.length !== storedHash.length) {
      return false;
    }
    let mismatch = 0;
    for (let i = 0; i < computedHash.length; i++) {
      mismatch |= computedHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
    }
    return mismatch === 0;
  } catch {
    return false;
  }
}

/**
 * Validates whether a new password meets the minimum requirement
 */
export function validatePasswordCriteria(password: string): { isValid: boolean; error?: string } {
  if (!password) {
    return { isValid: false, error: 'Password cannot be empty.' };
  }
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters in length.' };
  }
  return { isValid: true };
}
