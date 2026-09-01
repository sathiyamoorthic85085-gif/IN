import { trpc } from "@/lib/trpc";
import { useCallback } from "react";

export type AuthUser = {
  id?: number | string;
  openId?: string;
  name?: string | null;
  email?: string | null;
  role?: "user" | "admin";
};

export function useAuth() {
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  const logout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  return {
    user: (meQuery.data as AuthUser | null | undefined) ?? null,
    loading: meQuery.isLoading,
    error: meQuery.error,
    logout,
    refetch: meQuery.refetch,
  };
}
