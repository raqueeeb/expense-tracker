import * as React from "react";
import { cn } from "@/lib/utils";

/* --- Button ------------------------------------------------------------- */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

const buttonVariants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover disabled:bg-brand/50",
  secondary:
    "border border-surface-line bg-surface text-ink hover:bg-surface-sunk dark:border-night-line dark:bg-night-sunk dark:text-slate-100 dark:hover:bg-night",
  ghost: "text-ink-soft hover:bg-surface-sunk dark:text-slate-300 dark:hover:bg-night-sunk",
  danger: "bg-debit text-white hover:bg-debit/90",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4 text-sm",
        buttonVariants[variant],
        className,
      )}
      {...props}
    />
  );
});

/* --- Card --------------------------------------------------------------- */

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-card border border-surface-line bg-surface dark:border-night-line dark:bg-night-sunk",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-surface-line px-4 py-3 dark:border-night-line">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-ink-soft dark:text-slate-400">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* --- Form fields -------------------------------------------------------- */

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string[];
  hint?: string;
  children: React.ReactNode;
}) {
  const errorId = `${htmlFor}-error`;
  const hintId = `${htmlFor}-hint`;
  const hasError = Boolean(error?.length);
  const showHint = Boolean(hint) && !hasError;

  // The message lives in a sibling <p>, so without aria-describedby a screen
  // reader announces the label but never the reason the field was rejected.
  const describedBy = hasError ? errorId : showHint ? hintId : undefined;
  const control = React.isValidElement<React.AriaAttributes>(children)
    ? React.cloneElement(children, {
        "aria-describedby": describedBy,
        "aria-invalid": hasError ? true : undefined,
      })
    : children;

  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {control}
      {showHint ? (
        <p id={hintId} className="text-xs text-ink-soft dark:text-slate-400">
          {hint}
        </p>
      ) : null}
      {hasError ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-debit">
          {error?.[0]}
        </p>
      ) : null}
    </div>
  );
}

const controlClasses =
  "w-full rounded-md border border-surface-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 disabled:opacity-60 dark:border-night-line dark:bg-night dark:text-slate-100";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(controlClasses, "h-10", className)} {...props} />;
  },
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return <select ref={ref} className={cn(controlClasses, "h-10", className)} {...props} />;
  },
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} rows={3} className={cn(controlClasses, className)} {...props} />;
  },
);

/* --- Feedback ----------------------------------------------------------- */

export function Alert({ tone = "error", children }: { tone?: "error" | "success"; children: React.ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        tone === "error"
          ? "border-debit/30 bg-debit-soft text-debit dark:bg-debit/10"
          : "border-credit/30 bg-credit-soft text-credit dark:bg-credit/10",
      )}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <p className="text-sm font-semibold">{title}</p>
      <p className="max-w-sm text-sm text-ink-soft dark:text-slate-400">{description}</p>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}

export function Badge({ tone, children }: { tone: "income" | "expense" | "neutral"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
        tone === "income" && "bg-credit-soft text-credit dark:bg-credit/15",
        tone === "expense" && "bg-debit-soft text-debit dark:bg-debit/15",
        tone === "neutral" && "bg-surface-sunk text-ink-soft dark:bg-night dark:text-slate-300",
      )}
    >
      {children}
    </span>
  );
}
