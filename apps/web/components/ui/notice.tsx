import { AlertTriangle, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";

const styles = {
  info: { box: "bg-accent-soft border-accent text-accent", Icon: Info },
  warn: { box: "bg-warning-soft border-warning text-warning", Icon: AlertTriangle },
  error: { box: "bg-danger-soft border-danger text-danger", Icon: XCircle },
} as const;

export function Notice({ tone = "info", children, id, className = "" }: { tone?: keyof typeof styles; children: ReactNode; id?: string; className?: string }) {
  const { box, Icon } = styles[tone];
  return (
    <div role="note" id={id} className={`flex gap-3 rounded-lg border-l-4 px-4 py-3 text-sm ${box} ${className}`}>
      <Icon aria-hidden className="mt-[1px] h-5 w-5 flex-none" />
      <div className="text-text">{children}</div>
    </div>
  );
}
