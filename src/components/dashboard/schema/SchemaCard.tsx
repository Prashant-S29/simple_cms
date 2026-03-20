import React from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CheckmarkCircle02Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { formatDate } from "~/lib/utils";

interface SchemaCardSchema {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  hasStructure: boolean;
  createdAt: Date;
}

interface Props {
  schema: SchemaCardSchema;
  orgSlug: string;
  projectSlug: string;
  orgId: string;
}

export const SchemaCard: React.FC<Props> = ({
  schema,
  orgSlug,
  projectSlug,
  orgId,
}) => (
  <Link
    href={`/dashboard/org/${orgSlug}/project/${projectSlug}/admin/schema/${schema.slug}?orgId=${orgId}`}
  >
    <div className="bg-secondary border flex h-full cursor-pointer flex-col justify-between rounded-lg p-4 pb-3 transition-colors hover:bg-sidebar/20">
      <div>
        <h3 className="leading-tight font-medium capitalize">{schema.title}</h3>
        {schema.description && (
          <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
            {schema.description}
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-0.5">
        <p className="text-muted-foreground flex items-center justify-between text-sm">
          <span>Structure</span>
          {schema.hasStructure ? (
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              size={16}
              className="text-green-500"
            />
          ) : (
            <HugeiconsIcon
              icon={Cancel01Icon}
              size={16}
              className="text-muted-foreground"
            />
          )}
        </p>
        <p className="text-muted-foreground flex items-center justify-between text-sm">
          <span>Created At</span>
          <span>{formatDate(schema.createdAt)}</span>
        </p>
      </div>
    </div>
  </Link>
);
