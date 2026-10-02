import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function BackButton({ href = "/" }: { href?: string }) {
  return (
    <Link
      to={href}
      className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      data-testid="link-back"
    >
      <ArrowLeft size={15} /> Back
    </Link>
  );
}
