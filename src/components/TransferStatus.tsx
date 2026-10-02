import React from "react";
import { Check, Wifi } from "lucide-react";
import { formatBytes, formatSpeed, formatEta } from "./Formatters";

export function TransferStatus({
  connected,
  progress,
  label,
  speed = 0,
  transferred = 0,
  total = 0,
  eta = 0,
}: {
  connected: boolean;
  progress: number;
  label: string;
  speed?: number;
  transferred?: number;
  total?: number;
  eta?: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6" data-testid="status-transfer">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={`grid h-9 w-9 place-items-center rounded-full ${
              progress === 100 ? "bg-accent text-accent-foreground shadow-[0_0_12px_hsl(var(--accent)/0.5)]" : "bg-accent/15 text-accent"
            }`}
          >
            {progress === 100 ? <Check size={17} /> : <Wifi size={17} />}
          </span>
          <div>
            <p className="text-sm font-bold text-primary">{label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {connected ? "Direct device link is active" : "Waiting for the other device"}
            </p>
          </div>
        </div>
        <span className="font-mono-ui text-sm font-bold text-primary">{progress}%</span>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4 text-xs">
        <div>
          <p className="text-muted-foreground">Transferred</p>
          <p className="mt-1 font-mono-ui font-bold text-primary">
            {transferred ? `${formatBytes(transferred)} / ${formatBytes(total)}` : "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Speed</p>
          <p className="mt-1 font-mono-ui font-bold text-primary">{formatSpeed(speed)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Time left</p>
          <p className="mt-1 font-mono-ui font-bold text-primary">{formatEta(eta)}</p>
        </div>
      </div>
    </div>
  );
}
