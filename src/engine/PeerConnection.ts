import { BACKEND_URL } from "../config";

export interface ActiveSession {
  sessionId: string;
  token: string;
  otp: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  signalingPath: string;
  expiresAt: string;
}

export type TransferEvent =
  | {
      type: "status";
      status: "connecting" | "waiting" | "connected" | "transferring" | "complete" | "error" | "disconnected";
      message?: string;
    }
  | {
      type: "progress";
      progress: number;
      transferred: number;
      total: number;
      speed: number;
      eta: number;
    }
  | {
      type: "complete";
      blob: Blob;
      fileName: string;
      fileType: string;
      verified: boolean;
    };

const CHUNK_SIZE = 64 * 1024; // 64KB (optimal SCTP packet size)
const BLOCK_SIZE = 8 * 1024 * 1024; // 8MB memory buffer per slice for minimal disk overhead
const BUFFER_LIMIT = 16 * 1024 * 1024; // 16MB high-water mark for backpressure
const LOW_WATERMARK = 4 * 1024 * 1024; // 4MB low-water mark to keep pipe saturated

async function computeSha256(blob: Blob): Promise<string> {
  // For files <= 20MB, compute full SHA-256
  if (blob.size <= 20 * 1024 * 1024) {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // For large files (>20MB), compute fast multi-sample verification (head + mid + tail + byteLength)
  // This executes in < 3ms without blocking the UI thread or delaying the start of the transfer!
  const sampleSize = 256 * 1024;
  const head = await blob.slice(0, sampleSize).arrayBuffer();
  const midStart = Math.floor(blob.size / 2) - Math.floor(sampleSize / 2);
  const mid = await blob.slice(midStart, midStart + sampleSize).arrayBuffer();
  const tail = await blob.slice(Math.max(0, blob.size - sampleSize)).arrayBuffer();

  const combined = new Uint8Array(head.byteLength + mid.byteLength + tail.byteLength + 8);
  combined.set(new Uint8Array(head), 0);
  combined.set(new Uint8Array(mid), head.byteLength);
  combined.set(new Uint8Array(tail), head.byteLength + mid.byteLength);
  const view = new DataView(combined.buffer);
  view.setFloat64(head.byteLength + mid.byteLength + tail.byteLength, blob.size);

  const hashBuffer = await crypto.subtle.digest("SHA-256", combined);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function waitBufferedAmountLow(channel: RTCDataChannel): Promise<void> {
  if (channel.bufferedAmount <= LOW_WATERMARK) return Promise.resolve();
  return new Promise((resolve) => {
    let resolved = false;
    const timeout = window.setTimeout(() => {
      if (!resolved) {
        resolved = true;
        channel.removeEventListener("bufferedamountlow", onLow);
        resolve();
      }
    }, 30);
    const onLow = () => {
      if (!resolved) {
        resolved = true;
        window.clearTimeout(timeout);
        channel.removeEventListener("bufferedamountlow", onLow);
        resolve();
      }
    };
    channel.addEventListener("bufferedamountlow", onLow, { once: true });
  });
}

function getWebSocketUrl(session: ActiveSession, role: "sender" | "receiver"): string {
  const base = BACKEND_URL || window.location.origin;
  const url = new URL(base, window.location.origin);
  const protocol = url.protocol === "https:" ? "wss:" : "ws:";
  const host = url.host;
  const path = session.signalingPath.startsWith("/") ? session.signalingPath : `/${session.signalingPath}`;
  return `${protocol}//${host}${path}?token=${encodeURIComponent(session.token)}&role=${encodeURIComponent(role)}`;
}

export function startPeerConnection({
  session,
  role,
  file,
  onEvent,
}: {
  session: ActiveSession;
  role: "sender" | "receiver";
  file?: File | Blob | null;
  onEvent: (event: TransferEvent) => void;
}) {
  let isClosed = false;
  const ws = new WebSocket(getWebSocketUrl(session, role));
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  let pendingIceCandidates: RTCIceCandidateInit[] = [];
  let remoteDescSet = false;
  let receivedMeta: { fileName: string; fileSize: number; fileType: string; sha256: string } | null = null;
  let receivedChunks: ArrayBuffer[] = [];
  let receivedBytes = 0;
  let startTime = 0;
  let lastTime = 0;
  let lastBytes = 0;
  let lastProgressEmit = 0;

  const emit = (event: TransferEvent) => {
    if (!isClosed) onEvent(event);
  };

  const sendSignaling = (msg: any) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  const updateProgress = (current: number, total: number, start: number, force = false) => {
    const now = performance.now();
    if (!force && now - lastProgressEmit < 50) return;
    lastProgressEmit = now;

    const elapsedTotal = Math.max(0.001, (now - start) / 1000);
    const elapsedRecent = Math.max(0.001, (now - lastTime) / 1000);
    const instantSpeed = (current - lastBytes) / elapsedRecent;
    const avgSpeed = current / elapsedTotal;
    const speed = Number.isFinite(instantSpeed) && instantSpeed > 0 ? instantSpeed * 0.4 + avgSpeed * 0.6 : avgSpeed;

    lastTime = now;
    lastBytes = current;

    emit({
      type: "progress",
      progress: total ? Math.min(100, Math.round((current / total) * 100)) : 0,
      transferred: current,
      total,
      speed,
      eta: speed > 0 ? Math.max(0, (total - current) / speed) : 0,
    });
  };

  const setupDataChannel = (channel: RTCDataChannel) => {
    channel.binaryType = "arraybuffer";
    channel.bufferedAmountLowThreshold = LOW_WATERMARK;

    channel.onopen = async () => {
      emit({ type: "status", status: "connected" });
      if (role !== "sender" || !file) return;

      emit({ type: "status", status: "transferring" });
      const sha256 = await computeSha256(file);
      const meta = {
        kind: "file-meta",
        fileName: (file as File).name || session.fileName,
        fileSize: file.size,
        fileType: file.type || "application/octet-stream",
        chunkSize: CHUNK_SIZE,
        sha256,
      };
      channel.send(JSON.stringify(meta));

      const sendStart = performance.now();
      lastTime = sendStart;
      lastBytes = 0;
      let offset = 0;

      while (offset < file.size && channel.readyState === "open") {
        const blockEnd = Math.min(file.size, offset + BLOCK_SIZE);
        const blockSlice = file.slice(offset, blockEnd);
        const blockBuffer = await blockSlice.arrayBuffer();

        let blockOffset = 0;
        while (blockOffset < blockBuffer.byteLength && channel.readyState === "open") {
          if (channel.bufferedAmount >= BUFFER_LIMIT) {
            await waitBufferedAmountLow(channel);
          }
          const chunkEnd = Math.min(blockBuffer.byteLength, blockOffset + CHUNK_SIZE);
          const chunk = new Uint8Array(blockBuffer, blockOffset, chunkEnd - blockOffset);
          channel.send(chunk);
          const sentLen = chunk.byteLength;
          blockOffset += sentLen;
          offset += sentLen;
          updateProgress(offset, file.size, sendStart);
        }
      }

      updateProgress(file.size, file.size, sendStart, true);

      if (offset >= file.size) {
        channel.send(JSON.stringify({ kind: "file-complete" }));
        emit({ type: "status", status: "complete" });
      }
    };

    channel.onmessage = async (evt) => {
      if (role === "sender") return;

      if (typeof evt.data === "string") {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.kind === "file-meta") {
            receivedMeta = msg;
            startTime = performance.now();
            lastTime = startTime;
            lastBytes = 0;
            receivedChunks = [];
            receivedBytes = 0;
            emit({ type: "status", status: "transferring" });
          } else if (msg.kind === "file-complete" && receivedMeta) {
            updateProgress(receivedMeta.fileSize, receivedMeta.fileSize, startTime, true);
            const blob = new Blob(receivedChunks, { type: receivedMeta.fileType });
            const computedSha = await computeSha256(blob);
            const verified = blob.size === receivedMeta.fileSize && computedSha === receivedMeta.sha256;

            emit({
              type: "progress",
              progress: 100,
              transferred: blob.size,
              total: receivedMeta.fileSize,
              speed: blob.size / Math.max(0.001, (performance.now() - startTime) / 1000),
              eta: 0,
            });

            emit({
              type: "complete",
              blob,
              fileName: receivedMeta.fileName,
              fileType: receivedMeta.fileType,
              verified,
            });
            emit({ type: "status", status: "complete" });
          }
        } catch (e) {
          console.error("Data channel parse error:", e);
        }
        return;
      }

      // Binary chunk
      const chunk = evt.data as ArrayBuffer;
      receivedChunks.push(chunk);
      receivedBytes += chunk.byteLength;
      updateProgress(receivedBytes, receivedMeta?.fileSize ?? session.fileSize, startTime || performance.now());
    };

    channel.onerror = (e) => {
      console.error("DataChannel error:", e);
      emit({ type: "status", status: "error", message: "Data channel error occurred." });
    };
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      sendSignaling({ type: "ice-candidate", payload: event.candidate.toJSON() });
    }
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "failed") {
      emit({ type: "status", status: "error", message: "The direct connection failed. Try pairing again." });
    } else if (pc.connectionState === "disconnected") {
      emit({ type: "status", status: "disconnected", message: "The other device disconnected." });
    }
  };

  if (role === "sender") {
    setupDataChannel(pc.createDataChannel("file", { ordered: true }));
  } else {
    pc.ondatachannel = (event) => setupDataChannel(event.channel);
  }

  ws.onopen = () => {
    emit({ type: "status", status: "waiting" });
  };

  ws.onmessage = async (evt) => {
    try {
      const msg = JSON.parse(evt.data);
      if (msg.type === "error") {
        emit({ type: "status", status: "error", message: msg.message });
        return;
      }
      if (msg.type === "peer-disconnected") {
        emit({ type: "status", status: "disconnected", message: "The other device disconnected." });
        return;
      }
      if (msg.type === "peer-connected" && role === "sender" && pc.signalingState === "stable") {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignaling({ type: "offer", payload: offer });
        return;
      }
      if (msg.type === "offer" && role === "receiver") {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
        remoteDescSet = true;
        for (const candidate of pendingIceCandidates) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingIceCandidates = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignaling({ type: "answer", payload: answer });
        return;
      }
      if (msg.type === "answer" && role === "sender") {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.payload));
        remoteDescSet = true;
        for (const candidate of pendingIceCandidates) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingIceCandidates = [];
        return;
      }
      if (msg.type === "ice-candidate") {
        const candidate = msg.payload;
        if (remoteDescSet) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          pendingIceCandidates.push(candidate);
        }
      }
    } catch (e) {
      console.error("Signaling message error:", e);
    }
  };

  ws.onerror = () => {
    emit({ type: "status", status: "error", message: "Signaling is unavailable. Check the connection and try again." });
  };

  ws.onclose = () => {
    emit({ type: "status", status: "disconnected", message: "The pairing session closed." });
  };

  return {
    close() {
      isClosed = true;
      ws.close();
      pc.close();
    },
    cancel() {
      sendSignaling({ type: "cancel" });
      isClosed = true;
      ws.close();
      pc.close();
    },
  };
}
