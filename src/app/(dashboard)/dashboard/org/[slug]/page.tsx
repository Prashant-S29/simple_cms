import { headers } from "next/headers";
import React from "react";
import { checkAuthServer } from "~/lib/auth";
import { OrgPage } from "./OrgPage";
import { ResourceHandler } from "~/components/common";

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

const OrgPageHandler: React.FC<Props> = async ({ params }) => {
  const { slug } = await params;

  const { session } = await checkAuthServer({
    headers: await headers(),
    redirectTo: "/login",
  });

  if (!session) return <ResourceHandler state="loading" />;

  return <OrgPage slug={slug} />;
};

export default OrgPageHandler;
