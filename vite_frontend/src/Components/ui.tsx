import type { ReactNode  , MouseEvent} from "react";

import logo from "../assets/logo_no_brandname.png"; // adjust path to your png

export function Topbar({ children }: { children?: ReactNode }) {
  return (
    <header className="h-14 bg-surface border-b border-border flex items-center px-5 gap-5 sticky top-0 z-50">
      <div className="flex items-center gap-2 font-semibold text-md">
        <img
          src={logo}
          alt="VERIFACTORY logo"
          className="w-[40px] h-[40px] object-contain"
        />
        <span>VERIFACTORY</span>
      </div>
      {children}
    </header>
  );
}

export function Sidebar({ children }: { children: ReactNode }) {
  return (
    <aside className="w-60 bg-surface border-r border-border p-3 shrink-0">{children}</aside>
  );
}

export function SidebarSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.05em] text-ink-faint px-2.5 pt-2.5 pb-1.5 font-semibold">{title}</div>
      <div className="space-y-px">{children}</div>
    </div>
  );
}


export function NavItem({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-base text-left ${
        active
          ? "bg-accent-soft text-accent font-medium"
          : "text-ink-muted hover:bg-gray-100 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function Panel({ title, subtitle, action, children }: {
  title: string; subtitle?: string; action?: ReactNode; children: ReactNode;
}) {
  return (
    <section className="bg-surface border border-border rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <div className="text-md font-semibold">{title}</div>
          {subtitle && <div className="text-sm text-ink-muted">{subtitle}</div>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Button({ variant = "default", children, ...props }: {
  variant?: "default" | "primary";
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = "inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[5px] text-base font-medium border cursor-pointer";
  const styles = variant === "primary"
    ? "bg-accent border-accent text-white hover:bg-accent-hover"
    : "bg-surface border-border-strong text-ink hover:bg-gray-50";
  return <button className={`${base} ${styles}`} {...props}>{children}</button>;
}

export function Pill({ tone, children }: { tone: "ok" | "warn" | "err"; children: ReactNode }) {
  const tones = {
    ok:   "bg-[#e8f7ee] text-success",
    warn: "bg-[#fef3e2] text-warning",
    err:  "bg-[#fdeaea] text-danger",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-current ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Stat({ label, value, delta, deltaTone }: {
  label: string; value: string; delta?: string; deltaTone?: "up" | "down";
}) {
  return (
    <div className="bg-surface border border-border rounded-md px-4 py-3.5">
      <div className="text-sm text-ink-muted">{label}</div>
      <div className="text-2xl font-semibold tracking-[-0.02em] mt-1.5">{value}</div>
      {delta && (
        <div className={`text-sm mt-1 ${deltaTone === "down" ? "text-danger" : "text-success"}`}>
          {deltaTone === "down" ? "▼" : "▲"} {delta}
        </div>
      )}
    </div>
  );
}