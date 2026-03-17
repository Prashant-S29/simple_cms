"use server";

import { type headers as nextHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "~/server/better-auth";

interface CheckAuthServerProps {
  headers: Awaited<ReturnType<typeof nextHeaders>>;
  redirectTo?: string;
}

/**
 * Server-side authentication check
 * @returns session data if authenticated, or redirects if redirectTo is provided
 */
export const checkAuthServer = async ({
  headers,
  redirectTo,
}: CheckAuthServerProps) => {
  const session = await auth.api.getSession({
    headers: headers,
  });

  if (redirectTo && !session) {
    redirect(redirectTo);
  }

  return { session };
};
