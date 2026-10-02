import React from "react";
import { Header } from "./Header";

export function Layout({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`sf-noise min-h-[100dvh] bg-background text-foreground ${className}`}>
      <Header />
      {children}
    </div>
  );
}
