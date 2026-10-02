/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + " " + sizes[i];
}

/**
 * Format speed (bytes/sec) to human-readable string
 */
export function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec === 0) return "0 B/s";
  const k = 1024;
  const sizes = ["B/s", "KB/s", "MB/s", "GB/s"];
  const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
  return parseFloat((bytesPerSec / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Format seconds to human-readable ETA
 */
export function formatEta(seconds: number): string {
  if (!seconds || !isFinite(seconds) || seconds <= 0) return "--";
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = Math.ceil(seconds % 60);
    return `${m}m ${s}s`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

/**
 * Get file type icon emoji
 */
export function getFileIcon(type: string, name: string): string {
  if (type.startsWith("image/")) return "🖼️";
  if (type.startsWith("video/")) return "🎬";
  if (type.startsWith("audio/")) return "🎵";
  if (type.startsWith("text/")) return "📄";
  if (type.includes("pdf")) return "📕";
  if (type.includes("zip") || type.includes("tar") || type.includes("rar") || type.includes("7z")) return "📦";
  if (type.includes("spreadsheet") || name.endsWith(".xlsx") || name.endsWith(".csv")) return "📊";
  if (type.includes("presentation") || name.endsWith(".pptx")) return "📽️";
  if (type.includes("document") || name.endsWith(".docx")) return "📝";
  if (name.match(/\.(js|ts|py|java|cpp|c|go|rs|rb)$/)) return "💻";
  if (name.match(/\.(apk|ipa)$/)) return "📱";
  if (name.match(/\.(exe|dmg|msi)$/)) return "⚙️";
  return "📁";
}

/**
 * Get the API base URL
 */
export function getApiUrl(): string {
  // In dev, use the local signaling server
  if (import.meta.env.DEV) {
    return "http://localhost:3001";
  }
  // In production, same origin
  return window.location.origin;
}

/**
 * Generate a unique file ID
 */
export function generateFileId(): string {
  return `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
