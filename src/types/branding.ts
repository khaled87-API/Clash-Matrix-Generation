export interface CompanyBranding {
  logoId?: string;
  logoName?: string;
  logoMimeType?: string;
  logoData?: string; // Data URL format (e.g. data:image/png;base64,...)
  width?: number;
  height?: number;
  fileSizeBytes?: number;
  updatedAt?: string;
}

export interface AdminAuthConfig {
  passwordHash: string;
  salt: string;
  iterations?: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSession {
  isAuthenticated: boolean;
  expiresAt: number | null; // Timestamp in milliseconds
}

export interface LogoValidationResult {
  isValid: boolean;
  error?: string;
  width?: number;
  height?: number;
  fileSizeBytes?: number;
  mimeType?: string;
  dataUrl?: string;
}

export interface BrandingState {
  branding: CompanyBranding | null;
  hasAdminPassword: boolean;
  isAdminAuthenticated: boolean;
  sessionRemainingSeconds: number;
  failedAttempts: number;
  lockedUntil: number | null; // Timestamp when lockout ends
}
