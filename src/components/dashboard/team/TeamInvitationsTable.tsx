"use client";

import React, { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Mail01Icon,
  ArrowReloadHorizontalIcon,
  Cancel01Icon,
  Clock01Icon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  MoreHorizontalIcon,
  SearchIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { api } from "~/trpc/react";
import { getRoleLabel } from "~/lib/permissions";
import { formatDate } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useDebounce } from "~/hooks";

interface InvitationRow {
  id: string;
  email: string;
  role: "admin" | "manager";
  status: "pending" | "expired" | "joined";
  expiresAt: Date;
  createdAt: Date;
  projectScopes: {
    projectId: string;
    projectName: string;
    projectSlug: string;
  }[];
}

interface Props {
  orgId: string;
}

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    icon: Clock01Icon,
    className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  },
  joined: {
    label: "Joined",
    icon: CheckmarkCircle01Icon,
    className: "bg-green-500/10 text-green-600 border-green-500/20",
  },
  expired: {
    label: "Expired",
    icon: AlertCircleIcon,
    className: "bg-red-500/10 text-red-600 border-red-500/20",
  },
} as const;

const InvitationStatusBadge: React.FC<{
  status: "pending" | "expired" | "joined";
}> = ({ status }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.className}`}
    >
      <HugeiconsIcon icon={cfg.icon} size={11} />
      {cfg.label}
    </span>
  );
};

const InvitationActionDialog: React.FC<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invitation: InvitationRow;
  orgId: string;
  onDone: () => void;
}> = ({ open, onOpenChange, invitation, orgId, onDone }) => {
  const utils = api.useUtils();
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const { mutate: revokeInvitation, isPending: revoking } =
    api.orgMember.revokeInvitation.useMutation({
      onSuccess: (res) => {
        if (res.error) {
          toast.error(res.error.message);
          return;
        }
        toast.success("Invitation revoked.");
        void utils.orgMember.getInvitations.invalidate({ orgId });
        onDone();
        onOpenChange(false);
      },
      onError: () => toast.error("Failed to revoke invitation."),
    });

  const { mutate: reinvite, isPending: reinviting } =
    api.orgMember.reinvite.useMutation({
      onSuccess: (res) => {
        if (res.error) {
          toast.error(res.error.message);
          return;
        }
        toast.success("Re-invitation sent!");
        void utils.orgMember.getInvitations.invalidate({ orgId });
        onDone();
        onOpenChange(false);
      },
      onError: () => toast.error("Failed to re-send invitation."),
    });

  useEffect(() => {
    if (open) setConfirmRevoke(false);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-full border">
              <HugeiconsIcon icon={Mail01Icon} size={18} />
            </div>
            <div>
              <DialogTitle className="text-base">
                {invitation.email}
              </DialogTitle>
              <DialogDescription className="mt-0.5 flex items-center gap-1.5">
                {getRoleLabel(invitation.role)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-2 rounded-xl border p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <InvitationStatusBadge status={invitation.status} />
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sent</span>
            <span>{formatDate(invitation.createdAt)}</span>
          </div>
          {invitation.status === "pending" && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expires</span>
              <span>{formatDate(invitation.expiresAt)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Role</span>
            <span className="flex items-center gap-1">
              {getRoleLabel(invitation.role)}
            </span>
          </div>
        </div>

        {invitation.projectScopes.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Project Access</p>
            <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
              {invitation.projectScopes.map((p) => (
                <div
                  key={p.projectId}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <span className="text-sm">{p.projectName}</span>
                  <HugeiconsIcon
                    icon={CheckmarkCircle01Icon}
                    size={16}
                    className="text-green-600"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 border-t pt-4">
          {invitation.status === "expired" && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              isLoading={reinviting}
              onClick={() => reinvite({ orgId, invitationId: invitation.id })}
            >
              <HugeiconsIcon icon={ArrowReloadHorizontalIcon} size={14} />
              Re-send Invitation
            </Button>
          )}
          {invitation.status === "pending" &&
            (!confirmRevoke ? (
              <Button
                variant="destructive"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => setConfirmRevoke(true)}
              >
                <HugeiconsIcon icon={Cancel01Icon} size={14} />
                Revoke Invitation
              </Button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-sm">
                  Revoke invitation for <strong>{invitation.email}</strong>?
                  They won&apos;t be able to join using this link.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmRevoke(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    isLoading={revoking}
                    onClick={() =>
                      revokeInvitation({ orgId, invitationId: invitation.id })
                    }
                  >
                    Yes, Revoke
                  </Button>
                </div>
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const TeamInvitationsTable: React.FC<Props> = ({ orgId }) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [actionInvitation, setActionInvitation] =
    useState<InvitationRow | null>(null);
  const debouncedSearch = useDebounce(search, 300);
  const limit = 10;

  const { data: response, isLoading } = api.orgMember.getInvitations.useQuery({
    orgId,
    page,
    limit,
    search: debouncedSearch || undefined,
  });

  const invitations: InvitationRow[] = useMemo(() => {
    if (!response || response.error) return [];
    return response.data.items;
  }, [response]);

  const total = !response || response.error ? 0 : response.data.total;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const columnHelper = createColumnHelper<InvitationRow>();

  const columns = useMemo(
    () =>
      [
        columnHelper.accessor("email", {
          header: "Email",
          cell: ({ row }) => (
            <div className="flex items-center gap-3">
              <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full border">
                <HugeiconsIcon icon={Mail01Icon} size={14} />
              </div>
              <span className="text-sm font-medium">{row.original.email}</span>
            </div>
          ),
        }),
        columnHelper.accessor("role", {
          header: "Role",
          cell: ({ getValue }) => {
            const role = getValue();
            return (
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{getRoleLabel(role)}</span>
              </div>
            );
          },
        }),
        columnHelper.accessor("status", {
          header: "Status",
          cell: ({ getValue }) => <InvitationStatusBadge status={getValue()} />,
        }),
        columnHelper.display({
          id: "projects",
          header: "Projects",
          cell: ({ row }) => {
            const { projectScopes, role } = row.original;
            if (role !== "manager")
              return <span className="text-muted-foreground text-sm">All</span>;
            if (projectScopes.length === 0)
              return (
                <span className="text-muted-foreground text-sm">None</span>
              );
            return (
              <div className="flex flex-wrap gap-1">
                {projectScopes.slice(0, 2).map((p) => (
                  <Badge
                    key={p.projectId}
                    variant="outline"
                    className="text-xs"
                  >
                    {p.projectName}
                  </Badge>
                ))}
                {projectScopes.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{projectScopes.length - 2}
                  </Badge>
                )}
              </div>
            );
          },
        }),
        columnHelper.accessor("createdAt", {
          header: "Sent",
          cell: ({ getValue }) => (
            <span className="text-muted-foreground text-sm">
              {formatDate(getValue())}
            </span>
          ),
        }),
        columnHelper.display({
          id: "actions",
          header: "",
          cell: ({ row }) => {
            if (row.original.status === "joined") return null;
            return (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setActionInvitation(row.original)}
              >
                <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
              </Button>
            );
          },
        }),
      ] as ColumnDef<InvitationRow, unknown>[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const table = useReactTable({
    data: invitations,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-xs">
        <HugeiconsIcon
          icon={SearchIcon}
          size={15}
          className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
        />
        <Input
          placeholder="Search invitations..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-9 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-xs font-semibold tracking-wide uppercase"
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-8 rounded-full" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="size-7 rounded" />
                  </TableCell>
                </TableRow>
              ))
            ) : invitations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <p className="text-muted-foreground text-sm">
                    {search
                      ? "No invitations match your search."
                      : "No invitations yet."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {actionInvitation && (
        <InvitationActionDialog
          open={!!actionInvitation}
          onOpenChange={(v) => {
            if (!v) setActionInvitation(null);
          }}
          invitation={actionInvitation}
          orgId={orgId}
          onDone={() => setActionInvitation(null)}
        />
      )}
    </div>
  );
};
