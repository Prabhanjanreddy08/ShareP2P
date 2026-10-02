/* ────────────────────────────────────────────────
   LifeDrop – shared types
   ──────────────────────────────────────────────── */

export type LifeDropItemKind = "file" | "text" | "url" | "note" | "code" | "contact" | "photo";

export interface LifeDropItem {
  id: string;
  kind: LifeDropItemKind;
  label: string;
  /** only for file / photo items */
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  /** local File reference (not serialised) */
  fileRef?: File;
  /** data-URI thumbnail for photo items */
  thumbnail?: string;
  /** for text / url / note / code / contact items */
  value?: string;
  /** optional language hint for code snippets */
  language?: string;
}

export interface LifeDropPayload {
  title: string;
  items: LifeDropItem[];
  totalFileSize: number;
  burnAfterPickup: boolean;
  pickedUp: boolean;
}

export interface LifeDropSession {
  sessionId: string;
  token: string;
  otp: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  signalingPath: string;
  expiresAt: string;
  lifedrop: LifeDropPayload;
}

/* ─── Icon / label helpers ─── */

export function kindLabel(kind: LifeDropItemKind): string {
  switch (kind) {
    case "file":
      return "File";
    case "photo":
      return "Photo";
    case "text":
      return "Text";
    case "url":
      return "Link";
    case "note":
      return "Note";
    case "code":
      return "Code";
    case "contact":
      return "Contact";
    default:
      return "Item";
  }
}

export function kindColor(kind: LifeDropItemKind): string {
  switch (kind) {
    case "file":
      return "bg-blue-500/15 text-blue-600 dark:text-blue-400";
    case "photo":
      return "bg-violet-500/15 text-violet-600 dark:text-violet-400";
    case "text":
      return "bg-orange-500/15 text-orange-600 dark:text-orange-400";
    case "url":
      return "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400";
    case "note":
      return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400";
    case "code":
      return "bg-orange-500/15 text-orange-600 dark:text-orange-400";
    case "contact":
      return "bg-pink-500/15 text-pink-600 dark:text-pink-400";
    default:
      return "bg-secondary text-primary";
  }
}

/** Create an empty item of a given kind */
export function createItem(kind: LifeDropItemKind, id?: string): LifeDropItem {
  const uid = id || `ld-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  switch (kind) {
    case "file":
      return { id: uid, kind, label: "File" };
    case "photo":
      return { id: uid, kind, label: "Photo" };
    case "text":
      return { id: uid, kind, label: "Copied text", value: "" };
    case "url":
      return { id: uid, kind, label: "Link", value: "" };
    case "note":
      return { id: uid, kind, label: "Note", value: "" };
    case "code":
      return { id: uid, kind, label: "Code snippet", value: "", language: "text" };
    case "contact":
      return { id: uid, kind, label: "Contact", value: "" };
    default:
      return { id: uid, kind, label: "Item", value: "" };
  }
}
