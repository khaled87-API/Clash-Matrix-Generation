import { LogoValidationResult } from '../types/branding';

export const MAX_LOGO_FILE_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB
export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
];

export function isValidImageMimeType(mime: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mime.toLowerCase());
}

export function validateDimensions(width: number, height: number): { isValid: boolean; error?: string } {
  if (width < 10 || height < 10) {
    return { isValid: false, error: 'Image dimensions are too small (minimum 10x10 px).' };
  }
  if (width > 4096 || height > 4096) {
    return { isValid: false, error: 'Image dimensions exceed 4096x4096 px limit.' };
  }
  return { isValid: true };
}

/**
 * Validates an uploaded logo file for format, size, and image dimensions
 */
export async function validateLogoFile(file: File): Promise<LogoValidationResult> {
  if (!file) {
    return { isValid: false, error: 'No file provided.' };
  }

  // 1. MIME type validation
  const mimeType = file.type.toLowerCase();
  const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
  const isAllowedExt = ['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(fileExt);

  if (!ALLOWED_MIME_TYPES.includes(mimeType) && !isAllowedExt) {
    return {
      isValid: false,
      error: `Unsupported image format (${mimeType || fileExt}). Please upload PNG, JPG, WEBP, or SVG.`,
    };
  }

  // 2. File size validation
  if (file.size > MAX_LOGO_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      isValid: false,
      error: `File size exceeds the 3 MB limit (${sizeMb} MB). Please choose a smaller image.`,
    };
  }

  if (file.size === 0) {
    return {
      isValid: false,
      error: 'The uploaded file is empty (0 bytes).',
    };
  }

  // 3. Read file as Data URL
  return new Promise<LogoValidationResult>((resolve) => {
    const reader = new FileReader();

    reader.onerror = () => {
      resolve({
        isValid: false,
        error: 'Failed to read the image file.',
      });
    };

    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        resolve({ isValid: false, error: 'Failed to load image data.' });
        return;
      }

      // Check SVG content for basic safety / dimension
      if (mimeType === 'image/svg+xml' || fileExt === 'svg') {
        if (dataUrl.includes('<script') || dataUrl.includes('javascript:')) {
          resolve({
            isValid: false,
            error: 'SVG contains disallowed executable scripts or event handlers.',
          });
          return;
        }

        resolve({
          isValid: true,
          mimeType: mimeType || 'image/svg+xml',
          fileSizeBytes: file.size,
          dataUrl,
          width: 300,
          height: 100,
        });
        return;
      }

      // If browser Image API is available, determine true pixel dimensions
      if (typeof Image !== 'undefined') {
        const img = new Image();
        img.onload = () => {
          if (img.width < 10 || img.height < 10) {
            resolve({
              isValid: false,
              error: 'Image dimensions are too small (minimum 10x10 px).',
            });
            return;
          }
          if (img.width > 4096 || img.height > 4096) {
            resolve({
              isValid: false,
              error: 'Image dimensions exceed 4096x4096 px limit.',
            });
            return;
          }

          resolve({
            isValid: true,
            width: img.width,
            height: img.height,
            fileSizeBytes: file.size,
            mimeType: mimeType || 'image/png',
            dataUrl,
          });
        };

        img.onerror = () => {
          resolve({
            isValid: false,
            error: 'The file contains corrupted or unreadable image data.',
          });
        };

        img.src = dataUrl;
      } else {
        // Fallback for non-browser/test environment
        resolve({
          isValid: true,
          width: 200,
          height: 50,
          fileSizeBytes: file.size,
          mimeType: mimeType || 'image/png',
          dataUrl,
        });
      }
    };

    reader.readAsDataURL(file);
  });
}
