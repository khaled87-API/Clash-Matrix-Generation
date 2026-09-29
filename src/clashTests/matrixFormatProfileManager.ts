import { MatrixFormatProfile, MatrixToleranceUnit } from '../types/clashTest';

export const BUILTIN_FORMAT_PROFILES: MatrixFormatProfile[] = [
  {
    id: 'profile_std_mm',
    name: 'Standard Metric (H/C - mm)',
    hardPrefix: 'H',
    clearancePrefix: 'C',
    unit: 'MM',
    delimiter: '-',
    isBuiltIn: true,
    notes: 'Default UK/ISO BIM format. e.g. H-400 (0.4m hard), C-100 (0.1m clearance)',
  },
  {
    id: 'profile_meters_m',
    name: 'Meters Format (HR/CR - m)',
    hardPrefix: 'HR',
    clearancePrefix: 'CR',
    unit: 'M',
    delimiter: '-',
    isBuiltIn: true,
    notes: 'Direct meter tolerance format. e.g. HR-1 (1.0m hard), CR-0.5 (0.5m clearance)',
  },
  {
    id: 'profile_compact_mm',
    name: 'Compact Metric (H/C mm no delimiter)',
    hardPrefix: 'H',
    clearancePrefix: 'C',
    unit: 'MM',
    delimiter: '',
    isBuiltIn: true,
    notes: 'Compact notation without delimiters. e.g. H500 (0.5m hard), C100 (0.1m clearance)',
  },
  {
    id: 'profile_centimeters_cm',
    name: 'Centimeters Format (H/C - cm)',
    hardPrefix: 'H',
    clearancePrefix: 'C',
    unit: 'CM',
    delimiter: '-',
    isBuiltIn: true,
    notes: 'Centimeter tolerance format. e.g. H-50 (0.5m hard), C-10 (0.1m clearance)',
  },
  {
    id: 'profile_imperial_in',
    name: 'Imperial Inches (H/C - in)',
    hardPrefix: 'H',
    clearancePrefix: 'C',
    unit: 'IN',
    delimiter: '-',
    isBuiltIn: true,
    notes: 'US Imperial inch tolerance format. e.g. H-4 (4 inches = 0.1016m)',
  },
  {
    id: 'profile_imperial_ft',
    name: 'Imperial Feet (HR/CR - ft)',
    hardPrefix: 'HR',
    clearancePrefix: 'CR',
    unit: 'FT',
    delimiter: '-',
    isBuiltIn: true,
    notes: 'US Imperial feet tolerance format. e.g. HR-1 (1 ft = 0.3048m)',
  },
];

const STORAGE_KEY_PROFILES = 'bim_clash_matrix_format_profiles';
const STORAGE_KEY_ACTIVE_PROFILE_ID = 'bim_clash_matrix_active_profile_id';

// In-memory fallback for headless or test environments
let memoryProfiles: MatrixFormatProfile[] | null = null;
let memoryActiveProfileId: string = 'profile_std_mm';

/**
 * Loads all available matrix format profiles (built-in + user-defined)
 */
export function loadMatrixFormatProfiles(): MatrixFormatProfile[] {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PROFILES);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge built-in profiles with saved user profiles
          const userProfiles = parsed.filter((p: MatrixFormatProfile) => !p.isBuiltIn);
          return [...BUILTIN_FORMAT_PROFILES, ...userProfiles];
        }
      }
    } catch {
      // Fallback
    }
  }

  if (memoryProfiles) {
    return memoryProfiles;
  }

  return [...BUILTIN_FORMAT_PROFILES];
}

/**
 * Saves format profiles to persistent storage
 */
export function saveMatrixFormatProfiles(profiles: MatrixFormatProfile[]): void {
  memoryProfiles = profiles;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Gets the currently active format profile
 */
export function getActiveFormatProfile(): MatrixFormatProfile {
  let activeId = memoryActiveProfileId;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const storedId = localStorage.getItem(STORAGE_KEY_ACTIVE_PROFILE_ID);
      if (storedId) {
        activeId = storedId;
      }
    } catch {
      // Ignore
    }
  }

  const all = loadMatrixFormatProfiles();
  const found = all.find((p) => p.id === activeId);
  return found || BUILTIN_FORMAT_PROFILES[0];
}

/**
 * Sets the active format profile ID in storage
 */
export function setActiveFormatProfile(profileId: string): void {
  memoryActiveProfileId = profileId;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_PROFILE_ID, profileId);
    } catch {
      // Ignore
    }
  }
}

/**
 * Creates or updates a custom format profile
 */
export function saveCustomFormatProfile(
  profile: {
    id?: string;
    name: string;
    hardPrefix: string;
    clearancePrefix: string;
    unit: MatrixToleranceUnit;
    delimiter: string;
    notes?: string;
  }
): MatrixFormatProfile {
  const all = loadMatrixFormatProfiles();
  const profileId = profile.id || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const newProfile: MatrixFormatProfile = {
    id: profileId,
    name: profile.name.trim() || 'Custom Profile',
    hardPrefix: profile.hardPrefix.trim().toUpperCase() || 'H',
    clearancePrefix: profile.clearancePrefix.trim().toUpperCase() || 'C',
    unit: profile.unit,
    delimiter: profile.delimiter !== undefined ? profile.delimiter : '-',
    isBuiltIn: false,
    notes: profile.notes || '',
  };

  const existingIdx = all.findIndex((p) => p.id === profileId);
  let updatedList: MatrixFormatProfile[];

  if (existingIdx >= 0) {
    updatedList = all.map((p, idx) => (idx === existingIdx ? newProfile : p));
  } else {
    updatedList = [...all, newProfile];
  }

  saveMatrixFormatProfiles(updatedList);
  setActiveFormatProfile(newProfile.id);
  return newProfile;
}

/**
 * Deletes a custom format profile (built-in profiles cannot be deleted)
 */
export function deleteCustomFormatProfile(profileId: string): boolean {
  const all = loadMatrixFormatProfiles();
  const target = all.find((p) => p.id === profileId);
  if (!target || target.isBuiltIn) {
    return false;
  }

  const updatedList = all.filter((p) => p.id !== profileId);
  saveMatrixFormatProfiles(updatedList);

  if (getActiveFormatProfile().id === profileId) {
    setActiveFormatProfile(BUILTIN_FORMAT_PROFILES[0].id);
  }

  return true;
}

/**
 * Resets all profiles to factory defaults
 */
export function resetFormatProfiles(): MatrixFormatProfile[] {
  memoryProfiles = [...BUILTIN_FORMAT_PROFILES];
  memoryActiveProfileId = 'profile_std_mm';
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem(STORAGE_KEY_PROFILES);
      localStorage.removeItem(STORAGE_KEY_ACTIVE_PROFILE_ID);
    } catch {
      // Ignore
    }
  }
  return [...BUILTIN_FORMAT_PROFILES];
}
