export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(bytes > 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

export function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || !Number.isFinite(bytesPerSec)) return "—";
  return `${(bytesPerSec / (1024 * 1024)).toFixed(bytesPerSec > 10 * 1024 * 1024 ? 0 : 1)} MB/s`;
}

export function formatEta(seconds: number): string {
  if (!seconds || !Number.isFinite(seconds)) return "—";
  const sec = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}
