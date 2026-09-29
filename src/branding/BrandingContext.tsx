import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { CompanyBranding, AdminAuthConfig } from '../types/branding';
import {
  loadCompanyBranding,
  saveCompanyBranding,
  deleteCompanyBranding,
  loadAdminAuthConfig,
  saveAdminAuthConfig,
  deleteAdminAuthConfig,
} from './brandingStorage';
import {
  generateSalt,
  hashPassword,
  verifyPassword,
  validatePasswordCriteria,
} from './brandingCrypto';

const SESSION_DURATION_SECONDS = 15 * 60; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 30; // 30 seconds

interface BrandingContextType {
  branding: CompanyBranding | null;
  isLoading: boolean;
  hasAdminPassword: boolean;
  isAdminAuthenticated: boolean;
  sessionRemainingSeconds: number;
  isLockedOut: boolean;
  lockoutRemainingSeconds: number;
  failedAttempts: number;
  setupAdminPassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  authenticateAdmin: (password: string) => Promise<{ success: boolean; error?: string }>;
  logoutAdmin: () => void;
  changeAdminPassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  saveLogo: (newBranding: CompanyBranding) => Promise<void>;
  removeLogo: () => Promise<void>;
  resetAdminConfigAndLogo: () => Promise<void>;
  refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType | null>(null);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<CompanyBranding | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasAdminPassword, setHasAdminPassword] = useState<boolean>(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const [sessionRemainingSeconds, setSessionRemainingSeconds] = useState<number>(0);

  // Throttling State
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockoutRemainingSeconds, setLockoutRemainingSeconds] = useState<number>(0);

  // Timer reference for ticker
  const tickerRef = useRef<number | null>(null);

  // Initialize and load persisted data
  const refreshBranding = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedBranding = await loadCompanyBranding();
      setBranding(loadedBranding);

      const authConfig = loadAdminAuthConfig();
      setHasAdminPassword(!!authConfig && !!authConfig.passwordHash);
    } catch (err) {
      console.error('Failed to load branding data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBranding();
  }, [refreshBranding]);

  // Session & Lockout countdown ticker
  useEffect(() => {
    const checkTimers = () => {
      const now = Date.now();

      // Check admin session
      if (sessionExpiresAt) {
        const remaining = Math.max(0, Math.ceil((sessionExpiresAt - now) / 1000));
        setSessionRemainingSeconds(remaining);
        if (remaining <= 0) {
          setIsAdminAuthenticated(false);
          setSessionExpiresAt(null);
        }
      } else {
        setSessionRemainingSeconds(0);
      }

      // Check lockout
      if (lockedUntil) {
        const remaining = Math.max(0, Math.ceil((lockedUntil - now) / 1000));
        setLockoutRemainingSeconds(remaining);
        if (remaining <= 0) {
          setLockedUntil(null);
        }
      } else {
        setLockoutRemainingSeconds(0);
      }
    };

    checkTimers();
    tickerRef.current = window.setInterval(checkTimers, 1000);

    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, [sessionExpiresAt, lockedUntil]);

  // 1. Initial Setup of Administrator Password
  const setupAdminPassword = useCallback(async (password: string) => {
    const val = validatePasswordCriteria(password);
    if (!val.isValid) {
      return { success: false, error: val.error };
    }

    try {
      const salt = generateSalt();
      const passwordHash = await hashPassword(password, salt);
      const config: AdminAuthConfig = {
        passwordHash,
        salt,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      saveAdminAuthConfig(config);
      setHasAdminPassword(true);
      setIsAdminAuthenticated(true);
      setSessionExpiresAt(Date.now() + SESSION_DURATION_SECONDS * 1000);
      setFailedAttempts(0);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to initialize password.' };
    }
  }, []);

  // 2. Authenticate Administrator
  const authenticateAdmin = useCallback(
    async (password: string) => {
      const now = Date.now();
      if (lockedUntil && lockedUntil > now) {
        const waitSec = Math.ceil((lockedUntil - now) / 1000);
        return {
          success: false,
          error: `Too many failed attempts. Authentication locked for ${waitSec} seconds.`,
        };
      }

      const authConfig = loadAdminAuthConfig();
      if (!authConfig) {
        return {
          success: false,
          error: 'Administrator password has not been created yet.',
        };
      }

      try {
        const isMatch = await verifyPassword(password, authConfig.passwordHash, authConfig.salt);
        if (isMatch) {
          setIsAdminAuthenticated(true);
          setSessionExpiresAt(Date.now() + SESSION_DURATION_SECONDS * 1000);
          setFailedAttempts(0);
          setLockedUntil(null);
          return { success: true };
        } else {
          const nextAttempts = failedAttempts + 1;
          setFailedAttempts(nextAttempts);

          if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
            const lockTime = Date.now() + LOCKOUT_DURATION_SECONDS * 1000;
            setLockedUntil(lockTime);
            setLockoutRemainingSeconds(LOCKOUT_DURATION_SECONDS);
            return {
              success: false,
              error: `Incorrect password. 5 failed attempts reached. Locked for ${LOCKOUT_DURATION_SECONDS}s.`,
            };
          }

          return {
            success: false,
            error: `Incorrect administrator password. (${MAX_FAILED_ATTEMPTS - nextAttempts} attempts remaining)`,
          };
        }
      } catch (err: any) {
        return { success: false, error: 'Authentication failed due to an unexpected error.' };
      }
    },
    [lockedUntil, failedAttempts]
  );

  // 3. Logout Administrator
  const logoutAdmin = useCallback(() => {
    setIsAdminAuthenticated(false);
    setSessionExpiresAt(null);
    setSessionRemainingSeconds(0);
  }, []);

  // 4. Change Administrator Password
  const changeAdminPassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const authConfig = loadAdminAuthConfig();
      if (!authConfig) {
        return { success: false, error: 'No administrator password configured.' };
      }

      // Verify current password first
      const isCurrentValid = await verifyPassword(
        currentPassword,
        authConfig.passwordHash,
        authConfig.salt
      );
      if (!isCurrentValid) {
        return { success: false, error: 'Current password verification failed.' };
      }

      // Validate new password
      const val = validatePasswordCriteria(newPassword);
      if (!val.isValid) {
        return { success: false, error: val.error };
      }

      try {
        const newSalt = generateSalt();
        const newHash = await hashPassword(newPassword, newSalt);
        const updatedConfig: AdminAuthConfig = {
          passwordHash: newHash,
          salt: newSalt,
          version: authConfig.version + 1,
          createdAt: authConfig.createdAt,
          updatedAt: new Date().toISOString(),
        };

        saveAdminAuthConfig(updatedConfig);
        setIsAdminAuthenticated(true);
        setSessionExpiresAt(Date.now() + SESSION_DURATION_SECONDS * 1000);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to update administrator password.' };
      }
    },
    []
  );

  // 5. Save / Replace Logo
  const saveLogo = useCallback(
    async (newBranding: CompanyBranding) => {
      if (!isAdminAuthenticated) {
        throw new Error('Administrator authentication required to save branding logo.');
      }
      await saveCompanyBranding(newBranding);
      setBranding(newBranding);
    },
    [isAdminAuthenticated]
  );

  // 6. Remove Logo
  const removeLogo = useCallback(async () => {
    if (!isAdminAuthenticated) {
      throw new Error('Administrator authentication required to remove branding logo.');
    }
    await deleteCompanyBranding();
    setBranding(null);
  }, [isAdminAuthenticated]);

  // 7. Reset Admin Config and Logo
  const resetAdminConfigAndLogo = useCallback(async () => {
    deleteAdminAuthConfig();
    await deleteCompanyBranding();
    setBranding(null);
    setHasAdminPassword(false);
    setIsAdminAuthenticated(false);
    setSessionExpiresAt(null);
    setFailedAttempts(0);
    setLockedUntil(null);
  }, []);

  const value: BrandingContextType = {
    branding,
    isLoading,
    hasAdminPassword,
    isAdminAuthenticated,
    sessionRemainingSeconds,
    isLockedOut: !!lockedUntil && lockedUntil > Date.now(),
    lockoutRemainingSeconds,
    failedAttempts,
    setupAdminPassword,
    authenticateAdmin,
    logoutAdmin,
    changeAdminPassword,
    saveLogo,
    removeLogo,
    resetAdminConfigAndLogo,
    refreshBranding,
  };

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
};

export const useBranding = (): BrandingContextType => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};
