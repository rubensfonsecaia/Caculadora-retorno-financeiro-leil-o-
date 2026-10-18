"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

/** Modal acessível (Radix): foco preso, Esc fecha, foco volta ao gatilho. */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-surface-inverse opacity-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-var(--space-7))] max-w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-6 shadow-raised focus:outline-none">
          <Dialog.Title className="mb-2 break-words text-lg">{title}</Dialog.Title>
          {description ? (
            <Dialog.Description className="mb-5 text-sm text-text-muted">{description}</Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
