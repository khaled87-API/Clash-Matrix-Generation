import { CompanyBranding, AdminAuthConfig } from '../types/branding';

const DB_NAME = 'BimClashMatrix_BrandingDB';
const DB_VERSION = 1;
const STORE_NAME = 'brandingStore';
const BRANDING_KEY = 'current_branding';

const LOCAL_STORAGE_ADMIN_KEY = 'bim_admin_auth_config_v1';
const LOCAL_STORAGE_BRANDING_FALLBACK_KEY = 'bim_company_branding_fallback_v1';

// In-memory fallback for headless test runners / environments without IDB or localStorage
let inMemoryBranding: CompanyBranding | null = null;
let inMemoryAdminConfig: AdminAuthConfig | null = null;

/**
 * Opens the IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB.'));
    };
  });
}

/**
 * Save Company Branding (IndexedDB with localStorage/in-memory fallback)
 */
export async function saveCompanyBranding(branding: CompanyBranding): Promise<void> {
  inMemoryBranding = branding;

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(branding, BRANDING_KEY);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (idbErr) {
    // Fallback to localStorage if IndexedDB is unavailable
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_BRANDING_FALLBACK_KEY, JSON.stringify(branding));
      } catch (lsErr) {
        console.warn('Could not save branding to localStorage fallback:', lsErr);
      }
    }
  }
}

/**
 * Load Company Branding (IndexedDB with fallback)
 */
export async function loadCompanyBranding(): Promise<CompanyBranding | null> {
  try {
    const db = await openDatabase();
    const result = await new Promise<CompanyBranding | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(BRANDING_KEY);

      req.onsuccess = () => {
        resolve((req.result as CompanyBranding) || null);
      };
      req.onerror = () => reject(req.error);
    });

    if (result) {
      inMemoryBranding = result;
      return result;
    }
  } catch (err) {
    // Fallback to localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        const item = localStorage.getItem(LOCAL_STORAGE_BRANDING_FALLBACK_KEY);
        if (item) {
          const parsed = JSON.parse(item) as CompanyBranding;
          inMemoryBranding = parsed;
          return parsed;
        }
      } catch {
        // ignore
      }
    }
  }

  return inMemoryBranding;
}

/**
 * Remove / Delete Company Branding from persistence
 */
export async function deleteCompanyBranding(): Promise<void> {
  inMemoryBranding = null;

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(BRANDING_KEY);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore
  }

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(LOCAL_STORAGE_BRANDING_FALLBACK_KEY);
    } catch {
      // ignore
    }
  }
}

/**
 * Load Administrator Authentication Configuration (Cryptographic hash + salt only)
 */
export function loadAdminAuthConfig(): AdminAuthConfig | null {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_ADMIN_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AdminAuthConfig;
        if (parsed.passwordHash && parsed.salt) {
          inMemoryAdminConfig = parsed;
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }
  return inMemoryAdminConfig;
}

/**
 * Save Administrator Authentication Configuration (Cryptographic hash + salt only)
 */
export function saveAdminAuthConfig(config: AdminAuthConfig): void {
  inMemoryAdminConfig = config;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_ADMIN_KEY, JSON.stringify(config));
    } catch (err) {
      console.warn('Failed to save admin auth config to localStorage:', err);
    }
  }
}

/**
 * Delete / Reset Administrator Authentication Configuration
 */
export function deleteAdminAuthConfig(): void {
  inMemoryAdminConfig = null;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(LOCAL_STORAGE_ADMIN_KEY);
    } catch {
      // ignore
    }
  }
}

/**
 * Clear both Admin config and Branding (Used for reset and testing)
 */
export async function clearAllAdminAndBranding(): Promise<void> {
  await deleteCompanyBranding();
  deleteAdminAuthConfig();
}

// Aliases for convenience & test parity
export const saveStoredBranding = saveCompanyBranding;
export const loadStoredBranding = loadCompanyBranding;
export const removeStoredBranding = deleteCompanyBranding;
export const saveStoredAdminAuth = saveAdminAuthConfig;
export const loadStoredAdminAuth = loadAdminAuthConfig;
