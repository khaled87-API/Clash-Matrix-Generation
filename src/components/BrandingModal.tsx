import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Upload,
  Trash2,
  X,
  CheckCircle,
  AlertTriangle,
  KeyRound,
  FileImage,
  RefreshCw,
  Eye,
  EyeOff,
  Layers,
  Clock,
} from 'lucide-react';
import { useBranding } from '../branding/BrandingContext';
import { validateLogoFile } from '../branding/logoValidator';
import { CompanyBranding } from '../types/branding';
import { EhafLogo } from './EhafLogo';

interface BrandingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BrandingModal: React.FC<BrandingModalProps> = ({ isOpen, onClose }) => {
  const {
    branding,
    hasAdminPassword,
    isAdminAuthenticated,
    sessionRemainingSeconds,
    isLockedOut,
    lockoutRemainingSeconds,
    setupAdminPassword,
    authenticateAdmin,
    logoutAdmin,
    changeAdminPassword,
    saveLogo,
    removeLogo,
    resetAdminConfigAndLogo,
  } = useBranding();

  // Tab / View States: 'overview' | 'auth' | 'setup' | 'upload' | 'change_password' | 'remove_confirm' | 'reset_confirm'
  const [currentView, setCurrentView] = useState<
    'overview' | 'auth' | 'setup' | 'upload' | 'change_password' | 'remove_confirm' | 'reset_confirm'
  >('overview');

  // Auth / Setup form state
  const [authPassword, setAuthPassword] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Change Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Upload Logo Staging State
  const [stagedBranding, setStagedBranding] = useState<CompanyBranding | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // General Notification / Error messages
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset internal states on open/close
  useEffect(() => {
    if (isOpen) {
      setActionError(null);
      setActionSuccess(null);
      setUploadError(null);
      setStagedBranding(null);
      setAuthPassword('');
      setSetupPassword('');
      setSetupConfirmPassword('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');

      if (!hasAdminPassword) {
        setCurrentView('setup');
      } else if (!isAdminAuthenticated) {
        setCurrentView('overview');
      } else {
        setCurrentView('overview');
      }
    }
  }, [isOpen, hasAdminPassword, isAdminAuthenticated]);

  // Keyboard navigation: Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Handle Initial Password Setup
  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    if (setupPassword.length < 8) {
      setActionError('Password must be at least 8 characters in length.');
      return;
    }
    if (setupPassword !== setupConfirmPassword) {
      setActionError('Passwords do not match. Please verify and try again.');
      return;
    }

    setIsSubmitting(true);
    const res = await setupAdminPassword(setupPassword);
    setIsSubmitting(false);

    if (res.success) {
      setActionSuccess('Administrator password created successfully! Admin session unlocked.');
      setCurrentView('overview');
    } else {
      setActionError(res.error || 'Failed to setup password.');
    }
  };

  // Handle Authentication Submission
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    if (!authPassword) {
      setActionError('Please enter the administrator password.');
      return;
    }

    setIsSubmitting(true);
    const res = await authenticateAdmin(authPassword);
    setIsSubmitting(false);

    if (res.success) {
      setAuthPassword('');
      setActionSuccess('Administrator authentication verified.');
      setCurrentView('overview');
    } else {
      setActionError(res.error || 'Authentication failed.');
    }
  };

  // Handle Password Change Submission
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    if (!currentPassword) {
      setActionError('Please enter your current administrator password.');
      return;
    }
    if (newPassword.length < 8) {
      setActionError('New password must be at least 8 characters in length.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setActionError('New passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const res = await changeAdminPassword(currentPassword, newPassword);
    setIsSubmitting(false);

    if (res.success) {
      setActionSuccess('Administrator password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setCurrentView('overview');
    } else {
      setActionError(res.error || 'Failed to change password.');
    }
  };

  // File Drop & Select Processing
  const processSelectedFile = async (file: File) => {
    setUploadError(null);
    setIsProcessingFile(true);

    const validation = await validateLogoFile(file);
    setIsProcessingFile(false);

    if (!validation.isValid) {
      setUploadError(validation.error || 'Invalid logo file.');
      return;
    }

    const staged: CompanyBranding = {
      logoId: `logo_${Date.now()}`,
      logoName: file.name,
      logoMimeType: validation.mimeType,
      logoData: validation.dataUrl,
      width: validation.width,
      height: validation.height,
      fileSizeBytes: validation.fileSizeBytes,
      updatedAt: new Date().toISOString(),
    };

    setStagedBranding(staged);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  // Save Staged Logo
  const handleSaveStagedLogo = async () => {
    if (!stagedBranding) return;
    try {
      setIsSubmitting(true);
      await saveLogo(stagedBranding);
      setIsSubmitting(false);
      setActionSuccess('Company logo saved and applied to header.');
      setStagedBranding(null);
      setCurrentView('overview');
    } catch (err: any) {
      setIsSubmitting(false);
      setActionError(err.message || 'Failed to save company logo.');
    }
  };

  // Confirm Removal of Logo
  const handleConfirmRemoveLogo = async () => {
    try {
      setIsSubmitting(true);
      await removeLogo();
      setIsSubmitting(false);
      setActionSuccess('Company logo removed. Default application branding restored.');
      setCurrentView('overview');
    } catch (err: any) {
      setIsSubmitting(false);
      setActionError(err.message || 'Failed to remove company logo.');
    }
  };

  // Confirm Local Admin & Logo Reset
  const handleConfirmReset = async () => {
    try {
      setIsSubmitting(true);
      await resetAdminConfigAndLogo();
      setIsSubmitting(false);
      setActionSuccess('Local administrator configuration and branding reset successfully.');
      setCurrentView('setup');
    } catch (err: any) {
      setIsSubmitting(false);
      setActionError(err.message || 'Failed to reset configuration.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="branding-modal-title"
    >
      <div className="relative w-full max-w-xl rounded-2xl bg-[#090F1E] border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.2)] text-slate-100 flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 id="branding-modal-title" className="text-base font-bold text-white flex items-center gap-2">
                <span>Company Branding & Logo</span>
                {isAdminAuthenticated ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <Unlock className="w-3 h-3" />
                    Admin Active ({formatTime(sessionRemainingSeconds)})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <Lock className="w-3 h-3" />
                    Password Protected
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Administrator management for header branding and company identity
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Notifications */}
        {actionError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">{actionError}</div>
          </div>
        )}

        {actionSuccess && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">{actionSuccess}</div>
          </div>
        )}

        {/* Main Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* ============================================================ */}
          {/* VIEW: SETUP INITIAL PASSWORD                                */}
          {/* ============================================================ */}
          {currentView === 'setup' && (
            <form onSubmit={handleSetupSubmit} className="space-y-4">
              <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-200 leading-relaxed">
                <div className="font-semibold text-cyan-300 flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  Initial Administrator Setup
                </div>
                Create an administrator password to protect Company Branding management. Stored securely via salted cryptographic hash.
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="setup-pwd">
                    Administrator Password (8+ characters)
                  </label>
                  <div className="relative">
                    <input
                      id="setup-pwd"
                      type={showPassword ? 'text' : 'password'}
                      value={setupPassword}
                      onChange={(e) => setSetupPassword(e.target.value)}
                      placeholder="Enter administrator password..."
                      className="w-full px-3.5 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="setup-confirm-pwd">
                    Confirm Password
                  </label>
                  <input
                    id="setup-confirm-pwd"
                    type={showPassword ? 'text' : 'password'}
                    value={setupConfirmPassword}
                    onChange={(e) => setSetupConfirmPassword(e.target.value)}
                    placeholder="Confirm administrator password..."
                    className="w-full px-3.5 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                {hasAdminPassword && (
                  <button
                    type="button"
                    onClick={() => setCurrentView('overview')}
                    className="px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-slate-300"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Save & Unlock Administrator
                </button>
              </div>
            </form>
          )}

          {/* ============================================================ */}
          {/* VIEW: AUTHENTICATION / UNLOCK                                */}
          {/* ============================================================ */}
          {currentView === 'auth' && (
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 text-xs text-slate-300">
                <div className="font-semibold text-white flex items-center gap-1.5 mb-1">
                  <KeyRound className="w-4 h-4 text-cyan-400" />
                  Administrator Authentication
                </div>
                Enter the administrator password to change or remove company branding.
              </div>

              {isLockedOut ? (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-rose-400" />
                    Authentication Temporarily Locked
                  </div>
                  <p>
                    Too many consecutive failed attempts. Please wait{' '}
                    <span className="font-mono font-bold text-white">{lockoutRemainingSeconds}s</span> before retrying.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="auth-pwd">
                    Administrator Password
                  </label>
                  <div className="relative">
                    <input
                      id="auth-pwd"
                      type={showPassword ? 'text' : 'password'}
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Enter administrator password..."
                      autoFocus
                      className="w-full px-3.5 py-2.5 rounded-lg bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentView('reset_confirm')}
                  className="text-[11px] text-slate-400 hover:text-rose-300 underline underline-offset-2 transition-colors"
                >
                  Forgot password / Reset local admin
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setCurrentView('overview')}
                    className="px-3.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || isLockedOut}
                    className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    Unlock
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* ============================================================ */}
          {/* VIEW: MAIN OVERVIEW (BRANDING PREVIEW & ACTIONS)            */}
          {/* ============================================================ */}
          {currentView === 'overview' && (
            <div className="space-y-6">
              {/* Logo Preview Showcase */}
              <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.08] relative overflow-hidden flex flex-col items-center justify-center text-center">
                <div className="absolute top-3 left-3 text-[11px] font-mono text-slate-400 flex items-center gap-1">
                  <FileImage className="w-3.5 h-3.5 text-cyan-400" />
                  Official Corporate Brand Asset
                </div>

                <div className="my-4 py-3 px-6 rounded-xl bg-white border border-[#D9E2EC] flex items-center justify-center min-h-[72px] min-w-[200px]">
                  <img
                    src="/ehaf-logo.jpg"
                    alt="EHAF"
                    className="max-h-12 max-w-[240px] object-contain"
                    style={{ objectFit: 'contain' }}
                  />
                </div>

                <div className="text-[11px] text-cyan-400/90 font-mono">
                  EHAF Standard Brand Asset (Immutable)
                </div>
              </div>

              {/* Immutable Brand Notice */}
              <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/20 text-slate-300 text-xs flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Logo Customization Disabled</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    The official EHAF logo is permanently bundled as a static application asset. Uploading, replacing, or deleting the logo has been locked.
                  </div>
                </div>
              </div>

              {/* Administrator Administration Section */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-slate-300 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-slate-400" />
                    <span>Administrator Security</span>
                  </div>
                  {isAdminAuthenticated && (
                    <button
                      onClick={logoutAdmin}
                      type="button"
                      className="text-[11px] text-slate-400 hover:text-amber-300 flex items-center gap-1 font-mono transition-colors"
                    >
                      <Lock className="w-3 h-3" />
                      Lock Admin Session
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {hasAdminPassword ? (
                    <>
                      <button
                        onClick={() => {
                          if (!isAdminAuthenticated) {
                            setCurrentView('auth');
                          } else {
                            setCurrentView('change_password');
                          }
                        }}
                        type="button"
                        className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-xs text-slate-200 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                        Change Administrator Password
                      </button>

                      <button
                        onClick={() => setCurrentView('reset_confirm')}
                        type="button"
                        className="px-3 py-1.5 rounded-lg bg-slate-900/60 hover:bg-rose-950/40 border border-white/10 hover:border-rose-500/30 text-xs text-slate-400 hover:text-rose-300 font-medium transition-colors cursor-pointer"
                      >
                        Reset Local Administrator
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setCurrentView('setup')}
                      type="button"
                      className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Configure Administrator Password
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW: UPLOAD & PREVIEW NEW LOGO                             */}
          {/* ============================================================ */}
          {currentView === 'upload' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-cyan-400" />
                  Upload & Preview Company Logo
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStagedBranding(null);
                    setCurrentView('overview');
                  }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Back
                </button>
              </div>

              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Upload Drop Zone */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".png,.jpg,.jpeg,.webp,.svg"
                className="hidden"
                id="file-input-logo"
              />

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
                  isDragging
                    ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
                    : 'border-white/15 bg-slate-900/40 hover:border-cyan-500/40 hover:bg-slate-900/70'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                  <FileImage className="w-6 h-6" />
                </div>
                <div className="text-xs font-semibold text-white mb-1">
                  Drag & Drop Company Logo, or click to browse
                </div>
                <div className="text-[11px] text-slate-400 max-w-sm">
                  Supported formats: <strong className="text-slate-300">PNG, JPG, WEBP, SVG</strong> (Max 3 MB)
                </div>
              </div>

              {/* Staged Preview */}
              {stagedBranding && (
                <div className="p-4 rounded-xl bg-black/40 border border-cyan-500/30 space-y-3">
                  <div className="text-xs font-semibold text-cyan-300 flex items-center justify-between">
                    <span>Staged Logo Preview</span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {stagedBranding.width}×{stagedBranding.height} px
                    </span>
                  </div>

                  <div className="py-3 px-4 rounded-lg bg-slate-900/80 border border-white/10 flex items-center justify-center min-h-[64px]">
                    <img
                      src={stagedBranding.logoData}
                      alt="Staged Preview"
                      className="max-h-12 max-w-[220px] object-contain"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="truncate max-w-[250px]">{stagedBranding.logoName}</span>
                    <span className="font-mono">{((stagedBranding.fileSizeBytes || 0) / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
              )}

              {/* Save / Cancel Controls */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStagedBranding(null);
                    setCurrentView('overview');
                  }}
                  className="px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!stagedBranding || isSubmitting || isProcessingFile}
                  onClick={handleSaveStagedLogo}
                  className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Save & Apply Logo
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW: CHANGE PASSWORD                                       */}
          {/* ============================================================ */}
          {currentView === 'change_password' && (
            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-cyan-400" />
                  Change Administrator Password
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentView('overview')}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Back
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="curr-pwd">
                    Current Password
                  </label>
                  <input
                    id="curr-pwd"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password..."
                    className="w-full px-3.5 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="new-pwd">
                    New Password (8+ characters)
                  </label>
                  <input
                    id="new-pwd"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password..."
                    className="w-full px-3.5 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    required
                    minLength={8}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1" htmlFor="confirm-new-pwd">
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-new-pwd"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm new password..."
                    className="w-full px-3.5 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentView('overview')}
                  className="px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Update Password
                </button>
              </div>
            </form>
          )}

          {/* ============================================================ */}
          {/* VIEW: REMOVE CONFIRMATION                                   */}
          {/* ============================================================ */}
          {currentView === 'remove_confirm' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200 space-y-2">
                <div className="font-semibold text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  Remove Company Logo?
                </div>
                <p>
                  Removing the company logo will restore the default application branding and icon across the header.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentView('overview')}
                  className="px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmRemoveLogo}
                  className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(244,63,94,0.4)] disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove Logo
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW: RESET LOCAL ADMIN CONFIG CONFIRMATION                 */}
          {/* ============================================================ */}
          {currentView === 'reset_confirm' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-2">
                <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  Reset Local Administrator Configuration
                </div>
                <p>
                  This action will erase the local administrator password and clear the custom Company Logo on this browser. You will be prompted to create a new administrator password on next use.
                </p>
                <p className="text-[11px] text-amber-400/80">
                  Project configuration, Excel mappings, and XML generation settings will remain unaffected.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentView('overview')}
                  className="px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmReset}
                  className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(244,63,94,0.4)] disabled:opacity-50 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Confirm Local Reset
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
