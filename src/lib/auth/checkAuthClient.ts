"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { authClient } from "~/server/better-auth/client";

interface CheckAuthClientProps {
  redirectTo?: string;
}

/**
 * Client-side authentication check hook
 */
export const useCheckAuthClient = ({
  redirectTo,
}: CheckAuthClientProps = {}) => {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const isAuthenticated = !!session;
  const isLoading = isPending;

  useEffect(() => {
    if (redirectTo && !isLoading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [redirectTo, isAuthenticated, isLoading, router]);

  return {
    session,
    isAuthenticated,
    isLoading,
  };
};
