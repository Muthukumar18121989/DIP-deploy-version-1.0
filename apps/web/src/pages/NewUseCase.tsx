import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { api } from "@/lib/api";

const EXAMPLE = {
  name: "Increase Product Sales",
  problem: "Product sales decreased in Q2 and we don't know why.",
  objective: "Understand why product sales decreased in Q2 and identify the best business decisions to improve revenue.",
  kpi: "Revenue",
  description:
    "We want to understand why product sales decreased in Q2 and identify the best business decisions to improve revenue.",
};

export default function NewUseCase() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EXAMPLE);

  const mutation = useMutation({
    mutationFn: () => api.createUseCase(form),
    onSuccess: (useCase) => {
      toast.success("Use case created");
      navigate(`/use-cases/${useCase.id}/data`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-6 py-12">
      <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back
      </Link>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
            <Sparkles className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Create a business use case</h1>
            <p className="text-sm text-foreground-muted">
              Describe your problem — the AI pipeline figures out the rest.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Use case details</CardTitle>
              <CardDescription>All five fields are used to shape the AI pipeline's approach.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Use case name</Label>
              <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Increase Product Sales" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="problem">Business problem</Label>
              <Textarea id="problem" value={form.problem} onChange={(e) => update("problem", e.target.value)} rows={2} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="objective">Business objective</Label>
              <Textarea id="objective" value={form.objective} onChange={(e) => update("objective", e.target.value)} rows={2} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kpi">Expected KPI</Label>
              <Input id="kpi" value={form.kpi} onChange={(e) => update("kpi", e.target.value)} placeholder="e.g. Revenue" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} />
            </div>

            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !form.name || !form.objective || !form.kpi}
              size="lg"
              className="mt-2 w-full"
            >
              {mutation.isPending ? "Creating..." : "Create use case"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
