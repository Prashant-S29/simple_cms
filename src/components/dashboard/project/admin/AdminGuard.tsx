"use client";

import { useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import { ResourceHandler } from "~/components/common";

export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId") ?? "";

  const { data: membership, isLoading } = api.orgMember.myMembership.useQuery(
    { orgId },
    { enabled: !!orgId },
  );

  if (isLoading || !orgId) return <ResourceHandler state="loading" />;

  if (
    membership?.error ||
    !membership?.data ||
    membership.data.orgRole === "manager"
  ) {
    return <ResourceHandler state="access_denied" />;
  }

  return <>{children}</>;
};
