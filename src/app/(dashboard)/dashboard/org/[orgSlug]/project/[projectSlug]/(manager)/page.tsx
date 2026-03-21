import { headers } from "next/headers";
import { checkAuthServer } from "~/lib/auth";
import { ResourceHandler } from "~/components/common";

interface Props {
  params: Promise<{ projectSlug: string; orgSlug: string }>;
  searchParams: Promise<{ orgId: string }>;
}

/**
 * /project/[projectSlug] — manager entry point.
 * Redirects to the first available schema's content page,
 * or shows an empty state if no schemas exist yet.
 */
const ProjectManagerPage: React.FC<Props> = async ({
  params,
  searchParams,
}) => {
  const { session } = await checkAuthServer({
    headers: await headers(),
    redirectTo: "/login",
  });

  if (!session) return <ResourceHandler state="loading" />;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <p className="text-muted-foreground text-sm">
        Select a schema from the sidebar to start editing content.
      </p>
    </div>
  );
};

export default ProjectManagerPage;
