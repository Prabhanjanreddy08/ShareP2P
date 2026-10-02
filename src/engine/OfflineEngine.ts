/* ============================================================
   Offline Transfer Engine
   Transfers files when there's NO network at all using:
   1. QR code chain (for small files ~50KB)
   2. Numeric code (for tiny data like text/URLs)
   3. WiFi Direct / Local hotspot WebRTC (same local network)
   Auto-detects best method based on file size and connectivity
   ============================================================ */

// Each QR code can hold ~2953 bytes of binary (version 40, low EC)
// We use version 25 with medium EC: ~1273 bytes safe
const QR_CHUNK_BYTES = 1000;
const MAX_QR_FILE_SIZE = 100 * 1024; // 100KB max for QR chain
const MAX_CODE_SIZE = 2048; // 2KB max for text/numeric code

export type OfflineMethod = "qr-chain" | "text-code" | "local-webrtc" | "none";

export interface QRChunk {
  index: number;
  total: number;
  fileId: string;
  fileName: string;
  data: string; // base64 encoded chunk
}

export interface OfflineStatus {
  method: OfflineMethod;
  progress: number; // 0-100
  currentChunk: number;
  totalChunks: number;
  message: string;
}

/**
 * Determines the best offline transfer method based on file sizes and connectivity
 */
export function detectOfflineMethod(totalSize: number, hasLocalNetwork: boolean): OfflineMethod {
  // Check network status
  const isOnline = navigator.onLine;

  if (isOnline) {
    return "none"; // Use normal WebRTC through server
  }

  if (hasLocalNetwork) {
    return "local-webrtc"; // WiFi Direct or hotspot
  }

  if (totalSize <= MAX_CODE_SIZE) {
    return "text-code"; // Tiny files/text: type a code
  }

  if (totalSize <= MAX_QR_FILE_SIZE) {
    return "qr-chain"; // Small files: QR code chain
  }

  return "none"; // Too large for offline, need network
}

/**
 * Encode file data into QR-safe chunks
 */
export function encodeFileToQRChunks(file: File): Promise<QRChunk[]> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = btoa(
        new Uint8Array(reader.result as ArrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );

      const totalChunks = Math.ceil(base64.length / QR_CHUNK_BYTES);
      const fileId = `qr-${Date.now()}`;
      const chunks: QRChunk[] = [];

      for (let i = 0; i < totalChunks; i++) {
        chunks.push({
          index: i,
          total: totalChunks,
          fileId,
          fileName: file.name,
          data: base64.slice(i * QR_CHUNK_BYTES, (i + 1) * QR_CHUNK_BYTES),
        });
      }

      resolve(chunks);
    };
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Decode received QR chunks back into a file
 */
export function decodeQRChunksToFile(chunks: QRChunk[]): Blob {
  // Sort by index
  const sorted = [...chunks].sort((a, b) => a.index - b.index);
  const base64 = sorted.map((c) => c.data).join("");

  // Decode base64 to binary
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes]);
}

/**
 * Encode small data (text, tiny files) as a numeric transfer code
 * Format: base36 encoded with header
 */
export function encodeToTextCode(data: string | ArrayBuffer): string {
  let bytes: Uint8Array;
  if (typeof data === "string") {
    bytes = new TextEncoder().encode(data);
  } else {
    bytes = new Uint8Array(data);
  }

  // Simple base64 encoding with a compact header
  const base64 = btoa(String.fromCharCode(...bytes));
  // Add a checksum (last 4 chars of SHA-like simple hash)
  let hash = 0;
  for (const b of bytes) {
    hash = ((hash << 5) - hash + b) | 0;
  }
  const checksum = Math.abs(hash).toString(36).slice(0, 4).padStart(4, "0");

  return `SF${checksum}${base64}`;
}

/**
 * Decode a text transfer code back to data
 */
export function decodeTextCode(code: string): Uint8Array | null {
  if (!code.startsWith("SF") || code.length < 7) return null;

  const checksum = code.slice(2, 6);
  const base64 = code.slice(6);

  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Verify checksum
    let hash = 0;
    for (const b of bytes) {
      hash = ((hash << 5) - hash + b) | 0;
    }
    const expected = Math.abs(hash).toString(36).slice(0, 4).padStart(4, "0");

    if (checksum !== expected) return null;

    return bytes;
  } catch {
    return null;
  }
}

/**
 * Check if local network (WiFi Direct / hotspot) is available
 * This tries to detect if we're on a local network without internet
 */
export async function checkLocalNetwork(): Promise<boolean> {
  // If we're online, we can use normal server relay
  if (navigator.onLine) return false;

  // Check if we can reach local network peers
  // This is a heuristic - in practice, the user would need to
  // connect to a WiFi Direct group or mobile hotspot first
  try {
    const pc = new RTCPeerConnection();
    const candidates: string[] = [];

    return new Promise((resolve) => {
      pc.onicecandidate = (e) => {
        if (e.candidate?.candidate) {
          candidates.push(e.candidate.candidate);
          // Look for local/private IP addresses
          const hasLocal = candidates.some(
            (c) =>
              c.includes("192.168.") ||
              c.includes("10.") ||
              c.includes("172.16.") ||
              c.includes("172.17.") ||
              c.includes("172.18.") ||
              c.includes("172.19.") ||
              c.includes("172.2") ||
              c.includes("172.3")
          );
          if (hasLocal) {
            pc.close();
            resolve(true);
          }
        }
      };

      // Create a dummy data channel to trigger ICE gathering
      pc.createDataChannel("probe");
      pc.createOffer().then((o) => pc.setLocalDescription(o));

      // Timeout after 3 seconds
      setTimeout(() => {
        pc.close();
        resolve(false);
      }, 3000);
    });
  } catch {
    return false;
  }
}
