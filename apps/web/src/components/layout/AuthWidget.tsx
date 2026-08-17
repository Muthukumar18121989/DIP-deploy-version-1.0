import { Link } from "react-router-dom";
import { LogOut, Shield, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/useAuthStore";

/** Small, isolated header widget — "Sign In" when logged out, name + sign
 * out (and an Admin Dashboard shortcut for admins) when logged in. Added to
 * both Topbar.tsx and WorkspaceShell.tsx so it's visible everywhere; using
 * the app without an account is unaffected either way. */
export function AuthWidget() {
  const { user, logout } = useAuthStore();

  if (!user) {
    return (
      <Button variant="secondary" size="sm" asChild>
        <Link to="/login">
          <UserIcon className="size-3.5" />
          <span className="hidden sm:inline">Sign In</span>
        </Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {user.role === "admin" && (
        <Button variant="ghost" size="sm" asChild title="Admin Dashboard">
          <Link to="/admin">
            <Shield className="size-3.5" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        title="Sign out"
        onClick={() => {
          // No explicit navigate() here: every route is already wrapped in
          // RequireAuth, which re-renders the instant `user` goes null and
          // redirects on its own. An extra imperative navigate("/login")
          // alongside it just raced RequireAuth's own redirect.
          logout();
          toast.success("Signed out");
        }}
      >
        <LogOut className="size-3.5" />
        <span className="hidden sm:inline max-w-24 truncate">{user.name}</span>
      </Button>
    </div>
  );
}
