"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  MoreVerticalIcon,
  Edit03Icon,
  Delete02Icon,
  RefreshIcon,
  Folder01Icon,
  Alert02Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { EditDialog, DeleteDialog, ResetDialog } from "./SchemaDialogs";

export interface SchemaCardSchema {
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
  projectId: string;
  orgId: string;
}

export const SchemaCard: React.FC<Props> = ({
  schema,
  orgSlug,
  projectSlug,
  projectId,
  orgId,
}) => {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <>
      <div className="bg-secondary group hover:bg-sidebar/20 relative flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 transition-colors">
        <Link
          href={`/dashboard/org/${orgSlug}/project/${projectSlug}/admin/schema/${schema.slug}?orgId=${orgId}`}
          className="absolute inset-0 z-10 rounded-lg"
          aria-label={schema.title}
        />

        {/* Left: icon + title */}
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={Folder01Icon}
            size={15}
            className="text-muted-foreground -mt-px shrink-0"
          />
          <span className="text-sm font-medium capitalize">{schema.title}</span>
        </div>

        {/* Right: warning + menu */}
        <div
          className="relative z-20 flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {!schema.hasStructure && (
            <Tooltip>
              <TooltipTrigger>
                <span className="flex cursor-default items-center p-1">
                  <HugeiconsIcon
                    icon={Alert02Icon}
                    size={13}
                    className="text-amber-500"
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">No structure defined yet</p>
              </TooltipContent>
            </Tooltip>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger
              render={<div className="flex items-center justify-center" />}
              nativeButton={false}
              tabIndex={-1}
            >
              <Button
                size="icon-xs"
                variant="ghost"
                className="text-muted-foreground"
                aria-label="Schema options"
              >
                <HugeiconsIcon icon={MoreVerticalIcon} size={13} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <HugeiconsIcon icon={Edit03Icon} size={14} />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setResetOpen(true)}
                disabled={!schema.hasStructure}
              >
                <HugeiconsIcon icon={RefreshIcon} size={14} />
                Reset Structure
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <HugeiconsIcon icon={Delete02Icon} size={14} />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <EditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        schema={schema}
        projectId={projectId}
        orgId={orgId}
        orgSlug={orgSlug}
        projectSlug={projectSlug}
      />
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        schema={schema}
        projectId={projectId}
        orgId={orgId}
      />
      <ResetDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        schema={schema}
        projectId={projectId}
        orgId={orgId}
      />
    </>
  );
};
