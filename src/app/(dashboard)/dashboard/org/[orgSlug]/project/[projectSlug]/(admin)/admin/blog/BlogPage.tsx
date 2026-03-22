// ─── BlogPage.tsx ─────────────────────────────────────────────────────────────
// src/app/(dashboard)/dashboard/org/[orgSlug]/project/[projectSlug]/(admin)/admin/blog/BlogPage.tsx

"use client";

import React from "react";
import { api } from "~/trpc/react";
import { ResourceHandler } from "~/components/common";
import { Skeleton } from "~/components/ui/skeleton";
import { AvailableBlogs } from "~/components/dashboard/blog/AvailableBlogs";

interface Props {
  projectSlug: string;
  orgSlug: string;
  orgId: string;
}

const BlogPage: React.FC<Props> = ({ projectSlug, orgId, orgSlug }) => {
  const { data: response, isLoading } = api.project.getBySlug.useQuery({
    slug: projectSlug,
    orgId,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex w-full flex-col gap-5">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-full max-w-xl" />
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!response?.data || response.error) {
    return <ResourceHandler state="not_found" />;
  }

  const project = response.data;

  return (
    <div>
      <AvailableBlogs
        projectId={project.id}
        projectSlug={projectSlug}
        orgSlug={orgSlug}
        orgId={orgId}
        myRole={project.myRole}
      />
    </div>
  );
};

export default BlogPage;

// ─── page.tsx ─────────────────────────────────────────────────────────────────
// src/app/(dashboard)/dashboard/org/[orgSlug]/project/[projectSlug]/(admin)/admin/blog/page.tsx

// import { headers } from "next/headers";
// import React from "react";
// import { checkAuthServer } from "~/lib/auth";
// import { ResourceHandler } from "~/components/common";
// import BlogPage from "./BlogPage";
//
// interface Props {
//   params: Promise<{ projectSlug: string; orgSlug: string }>;
//   searchParams: Promise<{ orgId: string }>;
// }
//
// const BlogPageHandler: React.FC<Props> = async ({ params, searchParams }) => {
//   const { projectSlug, orgSlug } = await params;
//   const { orgId } = await searchParams;
//   if (!projectSlug || !orgId) return <ResourceHandler state="not_found" />;
//   const { session } = await checkAuthServer({ headers: await headers(), redirectTo: "/login" });
//   if (!session) return <ResourceHandler state="loading" />;
//   return <BlogPage projectSlug={projectSlug} orgSlug={orgSlug} orgId={orgId} />;
// };
//
// export default BlogPageHandler;
