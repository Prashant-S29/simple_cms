import { headers } from "next/headers";
import React from "react";
import { checkAuthServer } from "~/lib/auth";
import { ResourceHandler } from "~/components/common";
import { BlogEditor } from "~/components/dashboard/blog/BlogEditor";

interface Props {
  params: Promise<{
    projectSlug: string;
    orgSlug: string;
    postSlug: string;
  }>;
  searchParams: Promise<{ orgId: string }>;
}

const BlogEditorPageHandler: React.FC<Props> = async ({
  params,
  searchParams,
}) => {
  const { projectSlug, orgSlug, postSlug } = await params;
  const { orgId } = await searchParams;

  if (!projectSlug || !orgId || !postSlug) {
    return <ResourceHandler state="not_found" />;
  }

  const { session } = await checkAuthServer({
    headers: await headers(),
    redirectTo: "/login",
  });

  if (!session) return <ResourceHandler state="loading" />;

  return (
    <BlogEditor
      postSlug={postSlug}
      projectSlug={projectSlug}
      orgSlug={orgSlug}
      orgId={orgId}
    />
  );
};

export default BlogEditorPageHandler;
