import React, { useEffect, useRef } from 'react';
import { Button } from './Button';

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null); // eslint-disable-line @typescript-eslint/no-unused-vars

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
      setTimeout(() => firstButtonRef.current?.focus(), 50);
    } else {
      dialog.close();
    }
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="p-0 rounded-[12px] border border-rule shadow-lg max-w-[440px] w-[calc(100%-32px)] backdrop:bg-ink-1/20"
      onCancel={onCancel}
    >
      <div className="p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-[18px] font-semibold text-ink-1">{title}</h2>
          <p className="text-[15px] text-ink-2 mt-1 leading-relaxed">{description}</p>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
