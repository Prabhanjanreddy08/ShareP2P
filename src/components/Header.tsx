import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Radio, Sun, Moon } from "lucide-react";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" data-testid="link-brand-home">
      <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-accent text-accent-foreground shadow-[3px_3px_0_hsl(var(--foreground))]">
        <Radio size={19} strokeWidth={2.6} />
      </span>
      {!compact && <span className="text-[17px] font-extrabold tracking-[-0.04em]">sharefast</span>}
    </Link>
  );
}

export function Header() {
  const [healthy, setHealthy] = useState(true);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("sharefast-theme");
    if (saved) return saved === "dark";
    return document.documentElement.classList.contains("dark") || window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("sharefast-theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/healthz");
        setHealthy(res.ok);
      } catch {
        setHealthy(false);
      }
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <BrandLogo />
      <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
        <span className="hidden items-center gap-1.5 sm:flex">
          <span className={`h-1.5 w-1.5 rounded-full ${healthy ? "bg-accent shadow-[0_0_8px_hsl(var(--accent))]" : "bg-muted-foreground"}`} />
          {healthy ? "Ready to share" : "Checking connection"}
        </span>
        <span className="h-4 w-px bg-border" />
        <span className="font-mono-ui tracking-[0.12em]">P2P / 01</span>
        <button
          type="button"
          onClick={() => setIsDark((prev) => !prev)}
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-primary transition-colors hover:bg-secondary"
          aria-label={isDark ? "Use light theme" : "Use dark theme"}
          data-testid="button-toggle-theme"
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  );
}
