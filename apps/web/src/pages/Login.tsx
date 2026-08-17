import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { useAuthStore } from "@/stores/useAuthStore";

/** The app's front door — every other route requires an account (see
 * RequireAuth.tsx), so this is effectively the landing page for anyone not
 * already signed in. A signed-in user landing here (e.g. a stale bookmark)
 * is bounced forward instead of shown the form again. */
export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function destinationFor(role: string): string {
    const redirect = searchParams.get("redirect");
    return redirect || (role === "admin" ? "/admin" : "/");
  }

  useEffect(() => {
    if (user) navigate(destinationFor(user.role), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const signedInUser = mode === "login" ? await login(email, password) : await register(email, name, password);
      toast.success(mode === "login" ? "Signed in" : "Account created");
      navigate(destinationFor(signedInUser.role), { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
            <Sparkles className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{mode === "login" ? "Sign in" : "Create an account"}</h1>
            <p className="text-sm text-foreground-muted">
              {mode === "login" ? "Use cases you create will be tied to your account." : "Takes a few seconds."}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>{mode === "login" ? "Welcome back" : "Get started"}</CardTitle>
              <CardDescription>
                {mode === "login" ? "Enter your email and password." : "You'll be signed in right after."}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {mode === "register" && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </div>
              <Button type="submit" disabled={submitting} className="mt-2">
                {submitting ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => setMode((m) => (m === "login" ? "register" : "login"))}
              className="mt-4 text-sm text-foreground-muted hover:text-foreground"
            >
              {mode === "login" ? "Need an account? Create one" : "Already have an account? Sign in"}
            </button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
