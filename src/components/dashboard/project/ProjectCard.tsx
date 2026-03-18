import React from "react";
import Link from "next/link";
import { formatDate } from "~/lib/utils";

interface ProjectCardProject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  orgId: string;
  createdAt: Date;
}

interface Props {
  project: ProjectCardProject;
  orgSlug: string;
  orgId: string;
}

export const ProjectCard: React.FC<Props> = ({ project, orgSlug, orgId }) => (
  <Link
    href={`/dashboard/org/${orgSlug}/project/${project.slug}?orgId=${orgId}`}
  >
    <div className="bg-muted flex h-full cursor-pointer flex-col justify-between rounded-lg p-4 pb-3 transition-colors">
      <div>
        <h3 className="leading-tight font-medium">{project.name}</h3>
        {project.description && (
          <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
            {project.description}
          </p>
        )}
      </div>
      <p className="text-muted-foreground mt-3 flex items-center justify-between text-sm">
        <span>Created At</span>
        <span>{formatDate(project.createdAt)}</span>
      </p>
    </div>
  </Link>
);
