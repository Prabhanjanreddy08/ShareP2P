import React from "react";
import { LifeDropItem, LifeDropItemKind } from "../engine/lifedrop";
import { formatBytes } from "./Formatters";
import {
  FileUp,
  Camera,
  Type,
  Link2,
  StickyNote,
  Code2,
  UserRound,
  X,
  ChevronUp,
  ChevronDown,
  GripVertical,
} from "lucide-react";

function KindIcon({ kind, size = 16 }: { kind: LifeDropItemKind; size?: number }) {
  switch (kind) {
    case "file":
      return <FileUp size={size} />;
    case "photo":
      return <Camera size={size} />;
    case "text":
      return <Type size={size} />;
    case "url":
      return <Link2 size={size} />;
    case "note":
      return <StickyNote size={size} />;
    case "code":
      return <Code2 size={size} />;
    case "contact":
      return <UserRound size={size} />;
    default:
      return <FileUp size={size} />;
  }
}

function kindBg(kind: LifeDropItemKind): string {
  switch (kind) {
    case "file":
      return "bg-blue-500/15 text-blue-600";
    case "photo":
      return "bg-violet-500/15 text-violet-600";
    case "text":
      return "bg-orange-500/15 text-orange-600";
    case "url":
      return "bg-cyan-500/15 text-cyan-600";
    case "note":
      return "bg-yellow-500/15 text-yellow-700";
    case "code":
      return "bg-orange-500/15 text-orange-600";
    case "contact":
      return "bg-pink-500/15 text-pink-600";
    default:
      return "bg-secondary text-primary";
  }
}

export function LifeDropItemCard({
  item,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
  readOnly = false,
}: {
  item: LifeDropItem;
  index: number;
  total: number;
  onUpdate: (id: string, patch: Partial<LifeDropItem>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  readOnly?: boolean;
}) {
  const isFileType = item.kind === "file" || item.kind === "photo";

  return (
    <div className="group relative flex gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-accent/30 sm:p-5">
      {/* Grip + order */}
      {!readOnly && (
        <div className="flex flex-col items-center gap-1 pt-1">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove(item.id, -1)}
            className="rounded p-0.5 text-muted-foreground hover:text-primary disabled:opacity-20"
            aria-label="Move up"
          >
            <ChevronUp size={14} />
          </button>
          <GripVertical size={14} className="text-muted-foreground/40" />
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => onMove(item.id, 1)}
            className="rounded p-0.5 text-muted-foreground hover:text-primary disabled:opacity-20"
            aria-label="Move down"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      )}

      {/* Kind icon */}
      <span className={`mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${kindBg(item.kind)}`}>
        <KindIcon kind={item.kind} size={18} />
      </span>

      {/* Content area */}
      <div className="min-w-0 flex-1">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <span className="font-mono-ui text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">
            {index + 1}/{total} · {item.kind}
          </span>
          {!readOnly && (
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label="Remove item"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* File items (read-only display) */}
        {isFileType && (
          <div className="mt-2">
            {item.thumbnail && (
              <img
                src={item.thumbnail}
                alt={item.label}
                className="mb-2 h-20 w-auto rounded-lg object-cover"
              />
            )}
            <p className="truncate text-sm font-bold text-primary">{item.fileName || item.label}</p>
            {item.fileSize != null && item.fileSize > 0 && (
              <p className="mt-0.5 font-mono-ui text-[10px] text-muted-foreground">
                {formatBytes(item.fileSize)} · {item.fileType || "file"}
              </p>
            )}
          </div>
        )}

        {/* Text / URL / Note / Contact – editable */}
        {!isFileType && !readOnly && (
          <div className="mt-2">
            {item.kind === "code" ? (
              <>
                <select
                  value={item.language || "text"}
                  onChange={(e) => onUpdate(item.id, { language: e.target.value })}
                  className="mb-2 h-7 rounded-md border border-input bg-background px-2 font-mono-ui text-[10px] text-primary focus:outline-none"
                >
                  {["text", "javascript", "typescript", "python", "json", "html", "css", "sql", "bash", "go", "rust", "java", "c", "cpp"].map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
                <textarea
                  value={item.value || ""}
                  onChange={(e) => onUpdate(item.id, { value: e.target.value, label: e.target.value.split("\n")[0]?.slice(0, 40) || "Code snippet" })}
                  placeholder="Paste or type code here…"
                  rows={4}
                  className="w-full resize-none rounded-xl border border-input bg-background p-3 font-mono text-xs text-primary placeholder:text-muted-foreground/40 focus:border-accent focus:outline-none"
                />
              </>
            ) : item.kind === "note" ? (
              <textarea
                value={item.value || ""}
                onChange={(e) => onUpdate(item.id, { value: e.target.value, label: e.target.value.slice(0, 50) || "Note" })}
                placeholder="Write your note here…"
                rows={3}
                className="w-full resize-none rounded-xl border border-input bg-background p-3 text-sm text-primary placeholder:text-muted-foreground/40 focus:border-accent focus:outline-none"
              />
            ) : item.kind === "url" ? (
              <input
                type="url"
                value={item.value || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  let label = "Link";
                  try { label = new URL(val).hostname; } catch {}
                  onUpdate(item.id, { value: val, label });
                }}
                placeholder="https://…"
                className="w-full rounded-xl border border-input bg-background p-3 text-sm text-primary placeholder:text-muted-foreground/40 focus:border-accent focus:outline-none"
              />
            ) : item.kind === "contact" ? (
              <textarea
                value={item.value || ""}
                onChange={(e) => onUpdate(item.id, { value: e.target.value, label: e.target.value.split("\n")[0]?.slice(0, 40) || "Contact" })}
                placeholder="Name, phone, email…"
                rows={2}
                className="w-full resize-none rounded-xl border border-input bg-background p-3 text-sm text-primary placeholder:text-muted-foreground/40 focus:border-accent focus:outline-none"
              />
            ) : (
              <textarea
                value={item.value || ""}
                onChange={(e) => onUpdate(item.id, { value: e.target.value, label: e.target.value.slice(0, 50) || "Text" })}
                placeholder="Type or paste text here…"
                rows={2}
                className="w-full resize-none rounded-xl border border-input bg-background p-3 text-sm text-primary placeholder:text-muted-foreground/40 focus:border-accent focus:outline-none"
              />
            )}
          </div>
        )}

        {/* Text / URL / Note / Contact – read-only view */}
        {!isFileType && readOnly && (
          <div className="mt-2">
            <p className="text-sm font-bold text-primary">{item.label}</p>
            {item.value && (
              <p className={`mt-1 text-xs text-muted-foreground ${item.kind === "code" ? "font-mono whitespace-pre-wrap break-all" : "break-words"} line-clamp-2`}>
                {item.value}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Compact read-only item for the share / receive views */
export function LifeDropItemCompact({ item, index }: { item: LifeDropItem; index: number }) {
  const isFileType = item.kind === "file" || item.kind === "photo";

  return (
    <div className="flex items-center gap-3 rounded-xl bg-secondary p-3">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${kindBg(item.kind)}`}>
        <KindIcon kind={item.kind} size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-primary">{item.label}</p>
        {isFileType && item.fileSize != null && (
          <p className="font-mono-ui text-[10px] text-muted-foreground">{formatBytes(item.fileSize)}</p>
        )}
        {!isFileType && item.value && (
          <p className="truncate text-[10px] text-muted-foreground">{item.value}</p>
        )}
      </div>
      <span className="font-mono-ui text-[10px] text-muted-foreground/60">{index + 1}</span>
    </div>
  );
}
