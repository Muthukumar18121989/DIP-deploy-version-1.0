import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";

/** Wraps every route except /login. Anonymous visitors are sent to sign in
 * first, with the page they wanted preserved as ?redirect= so Login.tsx can
 * send them straight back after. This is the only thing that changed about
 * existing pages' access — none of their internals were touched. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  return <>{children}</>;
}
