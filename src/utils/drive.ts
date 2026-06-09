/**
 * Extracts the Google Drive File ID from various URL patterns.
 * Supported patterns:
 * - https://drive.google.com/file/d/{FILE_ID}/view?usp=sharing
 * - https://drive.google.com/file/d/{FILE_ID}/preview
 * - https://drive.google.com/open?id={FILE_ID}
 * - https://docs.google.com/file/d/{FILE_ID}/edit
 * - Direct file ID (length ~33 chars, alpha-numeric, underscores, hyphens)
 */
export function getGoogleDriveFileId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // If it looks like a clean ID already
  if (/^[a-zA-Z0-9_-]{25,45}$/.test(trimmed)) {
    return trimmed;
  }

  // Regex patterns
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]{25,45})/,
    /id=([a-zA-Z0-9_-]{25,45})/,
    /\/file\/d\/([a-zA-Z0-9_-]{25,45})\/(?:view|preview|edit)/,
    /\/open\?id=([a-zA-Z0-9_-]{25,45})/
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Generates the standard Google Drive embed player URL.
 */
export function getGoogleDriveEmbedUrl(url: string): string | null {
  const fileId = getGoogleDriveFileId(url);
  if (!fileId) return null;
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * Generates the direct download/stream URL for smaller videos (<100MB).
 */
export function getGoogleDriveDirectStreamUrl(url: string): string | null {
  const fileId = getGoogleDriveFileId(url);
  if (!fileId) return null;
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * Generates the direct download link.
 * If it's a Google Drive folder, it returns the original URL.
 * If it's a file, it returns the direct download URL.
 */
export function getDirectDownloadUrl(url: string): string {
  if (!url) return '';
  // Check if it's a folder link
  if (url.includes('/folders/') || url.includes('/drive/folders/')) {
    return url;
  }
  const fileId = getGoogleDriveFileId(url);
  if (fileId) {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
  // Fallback
  return url;
}
