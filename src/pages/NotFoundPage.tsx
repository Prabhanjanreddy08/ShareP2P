import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { ArrowRight } from "lucide-react";

export function NotFoundPage() {
  return (
    <Layout>
      <main className="mx-auto max-w-xl px-5 pb-20 pt-24 sm:px-8">
        <span className="font-mono-ui text-xs text-accent">404 / OFF ROUTE</span>
        <h1 className="mt-5 font-display text-6xl leading-none text-primary">
          Nothing
          <br />
          <em>to pair here.</em>
        </h1>
        <p className="mt-6 text-sm leading-6 text-muted-foreground">
          This page is not part of the sharing lane.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-accent-foreground"
          data-testid="link-back-home"
        >
          Return home <ArrowRight size={16} />
        </Link>
      </main>
    </Layout>
  );
}
