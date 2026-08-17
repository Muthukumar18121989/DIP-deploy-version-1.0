import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";
import { setToken } from "@/lib/authToken";
import type { User } from "@/lib/types";

interface AuthState {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, name: string, password: string) => Promise<User>;
  logout: () => void;
}

/** Only `user` is persisted here (for display across reloads) — the bearer
 * token itself lives in its own localStorage key via lib/authToken.ts, so
 * api.ts can read it without importing this store (which imports api.ts to
 * call the auth endpoints; the other direction would be circular). */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: async (email, password) => {
        const res = await api.login(email, password);
        setToken(res.token);
        set({ user: res.user });
        return res.user;
      },
      register: async (email, name, password) => {
        const res = await api.register(email, name, password);
        setToken(res.token);
        set({ user: res.user });
        return res.user;
      },
      logout: () => {
        api.logout().catch(() => {});
        setToken(null);
        set({ user: null });
      },
    }),
    { name: "dip-auth-store", partialize: (state) => ({ user: state.user }) }
  )
);
