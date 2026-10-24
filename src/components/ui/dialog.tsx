"use client";
import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "./button";

/**
 * Accessible modal built on the native <dialog> element: focus is moved into
 * the dialog and trapped by the browser, Escape closes it, and focus returns
 * to the opener on close.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  size?: "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`m-auto w-[calc(100%-2rem)] ${size === "lg" ? "max-w-2xl" : "max-w-md"} rounded-2xl border border-border bg-surface p-0 text-fg shadow-card`}
    >
      {open ? (
        <div className="max-h-[85dvh] overflow-y-auto p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="text-base font-semibold tracking-tight">
                {title}
              </h2>
              {description ? (
                <p id={descId} className="mt-1 text-sm leading-relaxed text-muted">
                  {description}
                </p>
              ) : null}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fermer" className="-mr-2 -mt-1 shrink-0">
              <X aria-hidden className="h-4 w-4" />
            </Button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Supprimer",
  pending = false,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  pending?: boolean;
  error?: string | null;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title} description={description}>
      {error ? (
        <p role="alert" className="mb-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Annuler
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={pending}>
          {pending ? "Suppression…" : confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
