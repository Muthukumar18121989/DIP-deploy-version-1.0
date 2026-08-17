import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { api } from "@/lib/api";
import type { UseCaseSummary } from "@/lib/types";

export function EditUseCaseDialog({ useCase, trigger }: { useCase: UseCaseSummary; trigger: ReactNode }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(useCase.name);
  const [owner, setOwner] = useState(useCase.owner);
  const [tagsInput, setTagsInput] = useState(useCase.tags.join(", "));

  const mutation = useMutation({
    mutationFn: () =>
      api.updateUseCase(useCase.id, {
        name,
        owner,
        tags: tagsInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      toast.success("Use case updated");
      queryClient.invalidateQueries({ queryKey: ["use-cases"] });
      setOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogTitle>Edit use case</DialogTitle>
        <DialogDescription>Update name, owner, and tags.</DialogDescription>

        <div className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-owner">Owner</Label>
            <Input id="edit-owner" value={owner} onChange={(e) => setOwner(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
            <Input id="edit-tags" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="q2, pricing, priority" />
          </div>
        </div>

        <Button className="mt-6 w-full" onClick={() => mutation.mutate()} disabled={mutation.isPending || !name}>
          {mutation.isPending ? "Saving..." : "Save changes"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
