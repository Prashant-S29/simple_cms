"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
} from "@tanstack/react-table";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  MoreVerticalIcon,
  Edit03Icon,
  Delete02Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
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
import { Button } from "~/components/ui/button";
import { formatDate } from "~/lib/utils";
import type { SchemaCardSchema } from "./SchemaCard";
import { EditDialog, DeleteDialog, ResetDialog } from "./SchemaDialogs";

interface Props {
  schemas: SchemaCardSchema[];
  orgSlug: string;
  projectSlug: string;
  projectId: string;
  orgId: string;
}

export const SchemaTable: React.FC<Props> = ({
  schemas,
  orgSlug,
  projectSlug,
  projectId,
  orgId,
}) => {
  const [editTarget, setEditTarget] = useState<SchemaCardSchema | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SchemaCardSchema | null>(
    null,
  );
  const [resetTarget, setResetTarget] = useState<SchemaCardSchema | null>(null);

  const columnHelper = createColumnHelper<SchemaCardSchema>();

  const columns: ColumnDef<SchemaCardSchema, string>[] = [
    columnHelper.accessor("title", {
      header: "Title",
      cell: ({ row }) => {
        const schema = row.original;
        return (
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/org/${orgSlug}/project/${projectSlug}/admin/schema/${schema.slug}?orgId=${orgId}`}
              className="text-sm font-medium capitalize hover:underline"
            >
              {schema.title}
            </Link>
            {!schema.hasStructure && (
              <Tooltip>
                <TooltipTrigger>
                  <span className="flex cursor-default items-center">
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
          </div>
        );
      },
    }),
    columnHelper.accessor("description", {
      header: "Description",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground line-clamp-2 max-w-xl text-sm text-ellipsis">
          {getValue() ?? "—"}
        </span>
      ),
    }),
    columnHelper.accessor("createdAt", {
      header: "Created At",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground text-sm">
          {formatDate(getValue() as unknown as Date)}
        </span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const schema = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<div className="flex items-center justify-center" />}
                nativeButton={false}
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
                <DropdownMenuItem onClick={() => setEditTarget(schema)}>
                  <HugeiconsIcon icon={Edit03Icon} size={14} />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setResetTarget(schema)}
                  disabled={!schema.hasStructure}
                >
                  <HugeiconsIcon icon={RefreshIcon} size={14} />
                  Reset Structure
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteTarget(schema)}
                  className="text-destructive focus:text-destructive"
                >
                  <HugeiconsIcon icon={Delete02Icon} size={14} />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    }),
  ] as ColumnDef<SchemaCardSchema, string>[];

  const table = useReactTable({
    data: schemas,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <div className="px-3 py-2">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editTarget && (
        <EditDialog
          open={!!editTarget}
          onOpenChange={(v) => !v && setEditTarget(null)}
          schema={editTarget}
          projectId={projectId}
          orgId={orgId}
          orgSlug={orgSlug}
          projectSlug={projectSlug}
        />
      )}
      {deleteTarget && (
        <DeleteDialog
          open={!!deleteTarget}
          onOpenChange={(v) => !v && setDeleteTarget(null)}
          schema={deleteTarget}
          projectId={projectId}
          orgId={orgId}
        />
      )}
      {resetTarget && (
        <ResetDialog
          open={!!resetTarget}
          onOpenChange={(v) => !v && setResetTarget(null)}
          schema={resetTarget}
          projectId={projectId}
          orgId={orgId}
        />
      )}
    </>
  );
};
