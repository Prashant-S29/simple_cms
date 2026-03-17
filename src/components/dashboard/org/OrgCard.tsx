import React from "react";
import Link from "next/link";
import { formatDate } from "~/lib/utils";

interface OrgCardOrg {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  projectCount: number;
}

export const OrgCard: React.FC<{ org: OrgCardOrg }> = ({ org }) => (
  <Link href={`/dashboard/org/${org.slug}`} aria-label={org.slug}>
    <div className="bg-muted flex cursor-pointer flex-col justify-between rounded-lg p-4 transition-colors">
      <h3 className="leading-tight font-medium">{org.name}</h3>
      <p className="text-muted-foreground mt-3 flex items-center justify-between text-sm">
        <span>{org.projectCount === 1 ? "Project" : "Projects"}</span>
        <span>{org.projectCount}</span>
      </p>
      <p className="text-muted-foreground flex items-center justify-between text-sm">
        <span>Created At</span>
        <span>{formatDate(org.createdAt)}</span>
      </p>
    </div>
  </Link>
);
