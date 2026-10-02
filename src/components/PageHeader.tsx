import React from "react";
import { Layout } from "./Layout";
import { BackButton } from "./BackButton";

export function PageContainer({
  children,
  eyebrow,
  title,
  description,
}: {
  children: React.ReactNode;
  eyebrow: string;
  title: React.ReactNode;
  description: string;
}) {
  return (
    <Layout>
      <main className="mx-auto w-full max-w-5xl px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
        <BackButton />
        <div className="sf-rise max-w-2xl">
          <span className="font-mono-ui text-[10px] font-bold uppercase tracking-[.18em] text-accent">
            {eyebrow}
          </span>
          <h1 className="mt-4 font-display text-5xl leading-[.95] tracking-[-.045em] text-primary sm:text-7xl">
            {title}
          </h1>
          <p className="mt-6 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {children}
      </main>
    </Layout>
  );
}
