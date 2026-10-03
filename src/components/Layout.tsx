import React from "react";
import { Header } from "./Header";

export function Layout({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`sf-noise flex min-h-[100dvh] flex-col justify-between overflow-x-hidden bg-background text-foreground ${className}`}>
      <div className="w-full min-w-0 flex-1">
        <Header />
        {children}
      </div>
      <footer
        className="mt-auto border-t border-border/50 bg-background/80 py-6 backdrop-blur-sm"
        data-testid="footer-copyright"
      >
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 sm:flex-row sm:px-8">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="font-bold text-accent">ShareFast</span>
          </div>
          <p className="font-mono-ui text-[11px] text-muted-foreground/75">
            &copy; 2026 @prabhanjanreddy &middot; All rights reserved
          </p>
        </div>
      </footer>
    </div>
  );
}
