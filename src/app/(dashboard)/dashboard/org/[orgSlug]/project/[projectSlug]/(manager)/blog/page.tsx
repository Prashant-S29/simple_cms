import { headers } from "next/headers";
import { checkAuthServer } from "~/lib/auth";
import { ResourceHandler } from "~/components/common";

const ProjectManagerPage = async () => {
  const { session } = await checkAuthServer({
    headers: await headers(),
    redirectTo: "/login",
  });

  if (!session) return <ResourceHandler state="loading" />;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <p className="text-muted-foreground text-sm">
        Select a schema or blog post from the sidebar to start editing content.
      </p>
    </div>
  );
};

export default ProjectManagerPage;
