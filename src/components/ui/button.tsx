import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "inverse";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 rounded-[10px] font-medium whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 select-none";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover shadow-soft",
  secondary: "bg-surface text-fg border border-border hover:border-border-strong hover:bg-surface-2",
  ghost: "text-muted hover:text-fg hover:bg-sunken",
  danger: "bg-danger text-white hover:opacity-90",
  inverse: "bg-white text-ink hover:bg-white/90",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]",
  icon: "h-9 w-9",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size };

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
