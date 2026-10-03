import React, { useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { BackButton } from "../components/BackButton";
import { StatusMessage } from "../components/StatusMessage";
import { LifeDropItemCard } from "../components/LifeDropItemCard";
import { formatBytes } from "../components/Formatters";
import { apiUrl } from "../config";
import {
  LifeDropItem,
  LifeDropItemKind,
  createItem,
  kindLabel,
} from "../engine/lifedrop";
import {
  Package,
  Plus,
  ArrowRight,
  FileUp,
  Type,
  Link2,
  StickyNote,
  Code2,
  UserRound,
  Camera,
  ClipboardPaste,
  Flame,
  RefreshCw,
  X,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

const ADD_OPTIONS: { kind: LifeDropItemKind; icon: React.ReactNode; label: string }[] = [
  { kind: "file", icon: <FileUp size={16} />, label: "File" },
  { kind: "photo", icon: <Camera size={16} />, label: "Photo" },
  { kind: "text", icon: <Type size={16} />, label: "Text" },
  { kind: "url", icon: <Link2 size={16} />, label: "Link" },
  { kind: "note", icon: <StickyNote size={16} />, label: "Note" },
  { kind: "code", icon: <Code2 size={16} />, label: "Code" },
  { kind: "contact", icon: <UserRound size={16} />, label: "Contact" },
];

export function LifeDropCreatePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<LifeDropItem[]>([]);
  const [burn, setBurn] = useState(true);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  /* ─── Add items ─── */
  const addItem = useCallback(
    (kind: LifeDropItemKind) => {
      if (kind === "file") {
        fileInputRef.current?.click();
      } else if (kind === "photo") {
        photoInputRef.current?.click();
      } else {
        setItems((prev) => [...prev, createItem(kind)]);
      }
      setShowPicker(false);
    },
    []
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, kind: LifeDropItemKind) => {
    const files = e.target.files;
    if (!files) return;
    const newItems: LifeDropItem[] = Array.from(files).map((f) => ({
      ...createItem(kind),
      label: f.name,
      fileName: f.name,
      fileSize: f.size,
      fileType: f.type || "application/octet-stream",
      fileRef: f,
      ...(kind === "photo" ? { thumbnail: URL.createObjectURL(f) } : {}),
    }));
    setItems((prev) => [...prev, ...newItems]);
    e.target.value = "";
  };

  /* ─── Clipboard paste ─── */
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      // Detect if URL
      const isUrl = /^https?:\/\/\S+$/i.test(text.trim());
      const item = createItem(isUrl ? "url" : "text");
      item.value = text.trim();
      item.label = isUrl ? new URL(text.trim()).hostname : text.slice(0, 50) + (text.length > 50 ? "…" : "");
      setItems((prev) => [...prev, item]);
    } catch {
      setError("Clipboard access denied. Try copying the content first.");
      setTimeout(() => setError(""), 3000);
    }
  };

  /* ─── Update / remove ─── */
  const updateItem = useCallback((id: string, patch: Partial<LifeDropItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const moveItem = useCallback((id: string, dir: -1 | 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
      return copy;
    });
  }, []);

  /* ─── Create session ─── */
  const totalFileSize = items.reduce((s, i) => s + (i.fileSize || 0), 0);
  const fileItems = items.filter((i) => i.kind === "file" || i.kind === "photo");
  const textItems = items.filter((i) => i.kind !== "file" && i.kind !== "photo");
  const hasContent = items.length > 0 && items.every((i) => {
    if (i.kind === "file" || i.kind === "photo") return !!i.fileRef;
    return !!i.value?.trim();
  });

  const handleCreate = async () => {
    if (!hasContent) return;
    setError("");
    setIsPending(true);

    try {
      // Serialize items (strip fileRef, it stays local for WebRTC transfer)
      const serializedItems = items.map((item) => ({
        id: item.id,
        kind: item.kind,
        label: item.label,
        fileName: item.fileName,
        fileSize: item.fileSize,
        fileType: item.fileType,
        value: item.value,
        language: item.language,
      }));

      const res = await fetch(apiUrl("/api/lifedrop"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "My LifeDrop",
          items: serializedItems,
          burnAfterPickup: burn,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not create LifeDrop. Try again.");
      }

      const session = await res.json();
      // Store file references in sessionStorage for the share page
      const fileMap: Record<string, boolean> = {};
      items.forEach((item) => {
        if (item.fileRef) {
          fileMap[item.id] = true;
        }
      });

      // Store items with file refs in IndexedDB
      if (fileItems.length > 0) {
        const { cacheLifeDropFiles } = await import("../engine/fileCache");
        await cacheLifeDropFiles(items.filter((i) => i.fileRef).map((i) => ({ id: i.id, file: i.fileRef! })));
      }

      sessionStorage.setItem("sharefast-active-session", JSON.stringify(session));
      sessionStorage.setItem("lifedrop-items", JSON.stringify(items.map((i) => ({ ...i, fileRef: undefined, thumbnail: undefined }))));
      navigate(`/lifedrop/${session.sessionId}`);
    } catch (err: any) {
      setError(err.message || "Could not create LifeDrop.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Layout>
      <main className="mx-auto w-full max-w-4xl px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
        <BackButton />
        <div className="sf-rise">
          <span className="font-mono-ui text-[10px] font-bold uppercase tracking-[.18em] text-accent">
            01 / LifeDrop
          </span>
          <h1 className="mt-4 font-display text-5xl leading-[.95] tracking-[-.045em] text-primary sm:text-7xl">
            Pack what
            <br />
            <em>you need.</em>
          </h1>
          <p className="mt-6 max-w-md text-sm leading-6 text-muted-foreground">
            Add files, text, links, notes, code — anything you need for the task ahead. It ships as one package.
          </p>
        </div>

        {/* ─── Title ─── */}
        <div className="sf-rise sf-rise-1 mt-10">
          <label htmlFor="lifedrop-title" className="text-sm font-bold text-primary">
            Package name <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            id="lifedrop-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. College interview pack"
            className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-4 text-sm text-primary placeholder:text-muted-foreground/40 focus:border-accent focus:outline-none"
          />
        </div>

        {/* ─── Items list ─── */}
        <div className="sf-rise sf-rise-2 mt-8 space-y-3">
          {items.length === 0 ? (
            <div className="rounded-[1.6rem] border-2 border-dashed border-border bg-card p-8 sm:p-12 text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-accent/15 text-accent">
                <Package size={28} />
              </span>
              <p className="mt-5 text-lg font-bold text-primary">Your LifeDrop is empty</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add items below to build your package.
              </p>
            </div>
          ) : (
            items.map((item, idx) => (
              <LifeDropItemCard
                key={item.id}
                item={item}
                index={idx}
                total={items.length}
                onUpdate={updateItem}
                onRemove={removeItem}
                onMove={moveItem}
              />
            ))
          )}
        </div>

        {/* ─── Add buttons ─── */}
        <div className="mt-5 flex flex-wrap gap-2">
          {/* Quick add pills */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPicker(!showPicker)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-background transition-transform hover:-translate-y-0.5"
            >
              <Plus size={16} /> Add item
            </button>

            {showPicker && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowPicker(false)} />
                <div className="absolute left-0 top-full z-30 mt-2 grid w-72 grid-cols-2 gap-1.5 rounded-2xl border-2 border-border bg-card p-2.5 shadow-2xl">
                  {ADD_OPTIONS.map((opt) => (
                    <button
                      key={opt.kind}
                      type="button"
                      onClick={() => addItem(opt.kind)}
                      className="flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium text-primary transition-all hover:border-border hover:bg-secondary"
                    >
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handlePaste}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-secondary"
          >
            <ClipboardPaste size={15} /> Paste from clipboard
          </button>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFileChange(e, "file")}
        />
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileChange(e, "photo")}
        />

        {/* ─── Options ─── */}
        <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Flame size={18} className="text-accent" />
              <div>
                <p className="text-sm font-bold text-primary">Burn after pickup</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Automatically destroy the session after the receiver picks it up
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBurn(!burn)}
              className={`relative h-6 w-11 rounded-full transition-colors ${burn ? "bg-accent" : "bg-secondary"}`}
              aria-label="Toggle burn after pickup"
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${burn ? "left-[22px]" : "left-0.5"
                  }`}
              />
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <ShieldCheck size={14} className="shrink-0 text-accent" />
            Files transfer peer-to-peer. Text items ride the signaling channel — no permanent storage.
          </div>
        </div>

        {/* ─── Error ─── */}
        {error && (
          <div className="mt-4">
            <StatusMessage tone="error">
              <X size={15} className="mt-0.5 shrink-0" />
              {error}
            </StatusMessage>
          </div>
        )}

        {/* ─── Summary + Create ─── */}
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles size={14} className="text-accent" />
              {items.length} item{items.length !== 1 ? "s" : ""}
            </span>
            {totalFileSize > 0 && (
              <span className="font-mono-ui">{formatBytes(totalFileSize)} files</span>
            )}
            {textItems.length > 0 && (
              <span className="font-mono-ui">{textItems.length} text</span>
            )}
          </div>
          <button
            type="button"
            disabled={!hasContent || isPending}
            onClick={handleCreate}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-sm font-bold text-accent-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> Creating drop
              </>
            ) : (
              <>
                Create LifeDrop <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </main>
    </Layout>
  );
}
