import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Database } from "@/types/supabase";

type User = Database["public"]["Tables"]["users"]["Row"];

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      isLoading: true,
      setIsLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ user: null, isLoading: false }),
    }),
    {
      name: "hrms-auth-store",
      partialize: (state) => ({ user: state.user }),
    }
  )
);
