import React from "react";

export function StatusMessage({
  children,
  tone = "quiet",
}: {
  children: React.ReactNode;
  tone?: "error" | "success" | "quiet";
}) {
  const toneClasses =
    tone === "error"
      ? "border-destructive/25 bg-destructive/5 text-destructive"
      : tone === "success"
      ? "border-accent/30 bg-accent/10 text-accent"
      : "border-border bg-secondary text-muted-foreground";

  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-xs leading-relaxed ${toneClasses}`}
      data-testid="status-message"
    >
      {children}
    </div>
  );
}
