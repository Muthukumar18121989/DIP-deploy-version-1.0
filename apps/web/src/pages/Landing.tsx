import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  Gauge,
  GitBranch,
  Lightbulb,
  LineChart,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

const capabilities = [
  {
    icon: Brain,
    title: "Understands your business problem",
    description: "Describe an objective and KPI in plain English — the platform maps it to the right analytical approach.",
  },
  {
    icon: GitBranch,
    title: "Transparent AI pipeline",
    description: "Watch data profiling, feature engineering, model training, and evaluation happen stage by stage.",
  },
  {
    icon: Lightbulb,
    title: "Ranked business decisions",
    description: "Every option comes with real projected impact, confidence, risk, cost, and ROI — not a single black-box answer.",
  },
  {
    icon: Gauge,
    title: "Live what-if simulation",
    description: "Move a slider on price, marketing, or inventory and watch predictions update instantly from the trained model.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
            <Sparkles className="size-4 text-white" />
          </div>
          <span className="text-sm font-semibold">Decision Intelligence Platform</span>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link to="/use-cases">
            Launch platform <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </header>

      <section className="mx-auto max-w-4xl px-6 pb-20 pt-16 text-center sm:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-foreground-muted"
        >
          <span className="size-1.5 rounded-full bg-success" />
          Real ML pipeline, running live against real data
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
        >
          Transform enterprise data into{" "}
          <span className="text-gradient">business decisions</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-foreground-muted"
        >
          Describe a business problem. The platform reads your data, trains and compares real
          models, and generates ranked, explainable decisions — with a live simulator to stress-test
          every option before you commit.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-10 flex items-center justify-center gap-3"
        >
          <Button asChild size="lg">
            <Link to="/use-cases">
              Create your first use case <ArrowRight className="size-4" />
            </Link>
          </Button>
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map((cap, i) => (
            <motion.div
              key={cap.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <cap.icon className="size-4" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardTitle>{cap.title}</CardTitle>
                  <CardDescription>{cap.description}</CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-28">
        <Card className="overflow-hidden">
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <LineChart className="size-8 text-accent" />
            <h2 className="text-2xl font-semibold">Try the "Increase Product Sales" walkthrough</h2>
            <p className="max-w-lg text-sm text-foreground-muted">
              Generate a 150,000-row synthetic Sales dataset with a real, recoverable Q2 revenue
              shock baked in, then watch the AI pipeline explain — and fix — it.
            </p>
            <Button asChild>
              <Link to="/use-cases">
                Get started <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
