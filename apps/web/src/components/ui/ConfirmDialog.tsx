import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "./Dialog";
import { Button } from "./Button";

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = false,
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant={destructive ? "danger" : "primary"} size="sm" onClick={handleConfirm} disabled={pending}>
            {pending ? "Working..." : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
