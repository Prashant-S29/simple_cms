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
  UserRemoveIcon,
  MoreHorizontalIcon,
  CheckmarkCircle01Icon,
  SearchIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { api } from "~/trpc/react";
import type { OrgRole } from "~/lib/permissions";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Checkbox } from "~/components/ui/checkbox";
import { useDebounce } from "~/hooks";
import Image from "next/image";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemberRow {
  id: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: OrgRole;
  status: "active" | "removed";
  createdAt: Date;
  projectAccess: {
    projectId: string;
    projectName: string;
    projectSlug: string;
  }[];
}

interface Props {
  orgId: string;
  orgSlug: string;
  myRole: OrgRole;
  myUserId: string;
}

const Avatar: React.FC<{
  name: string;
  image: string | null;
  size?: number;
}> = ({ name, image, size = 32 }) => {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  if (image) {
    return (
      <Image
        src={image}
        alt={name}
        width={200}
        height={200}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="bg-muted flex shrink-0 items-center justify-center rounded-full text-xs font-semibold"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
};

// ─── Role Dropdown Cell ───────────────────────────────────────────────────────

const RoleCell: React.FC<{
  member: MemberRow;
  orgId: string;
  myRole: OrgRole;
  myUserId: string;
  onRoleChange: () => void;
}> = ({ member, orgId, myRole, myUserId, onRoleChange }) => {
  const utils = api.useUtils();
  const [pendingRole, setPendingRole] = useState<"admin" | "manager" | null>(
    null,
  );
  const [selfDemoteOpen, setSelfDemoteOpen] = useState(false);
  const isSelf = member.userId === myUserId;
  const isOwner = member.role === "owner";
  const canManage = myRole === "owner" || myRole === "admin";

  const { mutate: updateRole, isPending } =
    api.orgMember.updateRole.useMutation({
      onSuccess: (res) => {
        if (res.error) {
          toast.error(res.error.message);
          return;
        }
        toast.success("Role updated.");
        void utils.orgMember.getMembers.invalidate({ orgId });
        onRoleChange();
        setSelfDemoteOpen(false);
      },
      onError: () => toast.error("Failed to update role."),
    });

  // ── Fix: guard null from Base UI Select ───────────────────────────────────
  const handleRoleSelect = (value: string | null) => {
    if (!value) return;
    const newRole = value as "admin" | "manager";
    if (newRole === member.role) return;

    if (isSelf && member.role === "admin" && newRole === "manager") {
      setPendingRole(newRole);
      setSelfDemoteOpen(true);
      return;
    }
    updateRole({
      orgId,
      memberId: member.id,
      role: newRole,
      projectIds:
        newRole === "manager"
          ? member.projectAccess.map((p) => p.projectId)
          : undefined,
    });
  };

  const confirmSelfDemote = () => {
    if (!pendingRole) return;
    updateRole({
      orgId,
      memberId: member.id,
      role: pendingRole,
      projectIds:
        pendingRole === "manager"
          ? member.projectAccess.map((p) => p.projectId)
          : undefined,
    });
  };

  if (!canManage || isOwner) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-sm">{getRoleLabel(member.role)}</span>
      </div>
    );
  }

  return (
    <>
      <Select
        value={member.role}
        onValueChange={handleRoleSelect}
        disabled={isPending}
      >
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">
            <div className="flex items-center gap-1.5">Admin</div>
          </SelectItem>
          <SelectItem value="manager">
            <div className="flex items-center gap-1.5">Manager</div>
          </SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={selfDemoteOpen} onOpenChange={setSelfDemoteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change your role?</DialogTitle>
            <DialogDescription>
              You are changing your role from <strong>Admin</strong> to{" "}
              <strong>Manager</strong>. As a manager, you won&apos;t be able to
              manage the team or invite members to this organization.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelfDemoteOpen(false);
                setPendingRole(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              isLoading={isPending}
              onClick={confirmSelfDemote}
            >
              Yes, change role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ─── Projects Cell ────────────────────────────────────────────────────────────

const ProjectsCell: React.FC<{ member: MemberRow }> = ({ member }) => {
  if (member.role !== "manager")
    return <span className="text-muted-foreground text-sm">All</span>;
  if (member.projectAccess.length === 0)
    return <span className="text-muted-foreground text-sm">None</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {member.projectAccess.slice(0, 2).map((p) => (
        <Badge key={p.projectId} variant="outline" className="text-xs">
          {p.projectName}
        </Badge>
      ))}
      {member.projectAccess.length > 2 && (
        <Badge variant="outline" className="text-xs">
          +{member.projectAccess.length - 2}
        </Badge>
      )}
    </div>
  );
};

// ─── Action Dialog ────────────────────────────────────────────────────────────

const ActionDialog: React.FC<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  member: MemberRow;
  orgId: string;
  myRole: OrgRole;
  myUserId: string;
  onDone: () => void;
}> = ({ open, onOpenChange, member, orgId, myRole, myUserId, onDone }) => {
  const utils = api.useUtils();
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(() =>
    member.projectAccess.map((p) => p.projectId),
  );
  const [confirmRemove, setConfirmRemove] = useState(false);
  const canManage = myRole === "owner" || myRole === "admin";
  const isSelf = member.userId === myUserId;

  const { data: projectsRes } = api.project.getAll.useQuery(
    { orgId, page: 1, limit: 100 },
    { enabled: open },
  );
  const allProjects =
    projectsRes && !projectsRes.error ? projectsRes.data.items : [];

  const { mutate: updateRole, isPending: updatingRole } =
    api.orgMember.updateRole.useMutation({
      onSuccess: (res) => {
        if (res.error) {
          toast.error(res.error.message);
          return;
        }
        toast.success("Project access updated.");
        void utils.orgMember.getMembers.invalidate({ orgId });
        onDone();
        onOpenChange(false);
      },
      onError: () => toast.error("Failed to update project access."),
    });

  const { mutate: removeMember, isPending: removing } =
    api.orgMember.remove.useMutation({
      onSuccess: (res) => {
        if (res.error) {
          toast.error(res.error.message);
          return;
        }
        toast.success("Member removed.");
        void utils.orgMember.getMembers.invalidate({ orgId });
        onDone();
        onOpenChange(false);
      },
      onError: () => toast.error("Failed to remove member."),
    });

  useEffect(() => {
    if (open) {
      setSelectedProjectIds(member.projectAccess.map((p) => p.projectId));
      setConfirmRemove(false);
    }
  }, [open, member]);

  const toggleProject = (projectId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId],
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar name={member.name} image={member.image} size={40} />
            <div>
              <DialogTitle>{member.name}</DialogTitle>
              <DialogDescription className="mt-0.5">
                {member.email} · {getRoleLabel(member.role)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">
            {member.role === "manager" ? "Project Access" : "All Projects"}
          </p>
          {allProjects.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No projects in this org.
            </p>
          ) : (
            <div className="flex max-h-52 flex-col gap-1.5 overflow-y-auto">
              {allProjects.map((p) => {
                const hasAccess =
                  member.role === "manager"
                    ? selectedProjectIds.includes(p.id)
                    : true;
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <span className="text-sm">{p.name}</span>
                    {member.role === "manager" && canManage ? (
                      <Checkbox
                        checked={hasAccess}
                        onCheckedChange={() => toggleProject(p.id)}
                      />
                    ) : hasAccess ? (
                      <HugeiconsIcon
                        icon={CheckmarkCircle01Icon}
                        size={16}
                        className="text-green-600"
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
          {member.role === "manager" && canManage && (
            <Button
              size="sm"
              onClick={() =>
                updateRole({
                  orgId,
                  memberId: member.id,
                  role: "manager",
                  projectIds: selectedProjectIds,
                })
              }
              isLoading={updatingRole}
              disabled={updatingRole}
            >
              Save Access
            </Button>
          )}
        </div>

        {canManage && member.role !== "owner" && !isSelf && (
          <div className="border-t pt-4">
            {!confirmRemove ? (
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => setConfirmRemove(true)}
              >
                <HugeiconsIcon icon={UserRemoveIcon} size={15} />
                Remove Member
              </Button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-sm">
                  Are you sure you want to remove <strong>{member.name}</strong>{" "}
                  from this organization?
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmRemove(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    isLoading={removing}
                    onClick={() => removeMember({ orgId, memberId: member.id })}
                  >
                    Yes, Remove
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Table ───────────────────────────────────────────────────────────────

export const TeamMembersTable: React.FC<Props> = ({
  orgId,
  myRole,
  myUserId,
}) => {
  const utils = api.useUtils();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [actionMember, setActionMember] = useState<MemberRow | null>(null);
  const debouncedSearch = useDebounce(search, 300);
  const limit = 10;

  const { data: response, isLoading } = api.orgMember.getMembers.useQuery({
    orgId,
    page,
    limit,
    search: debouncedSearch || undefined,
  });

  const members: MemberRow[] = useMemo(() => {
    if (!response || response.error) return [];
    // active members only
    return response.data.items.filter((m) => m.status === "active");
  }, [response]);

  const total = !response || response.error ? 0 : response.data.total;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // ── Fix: don't annotate the array as ColumnDef<Row,unknown>[].
  // Instead type the columnHelper generically and cast each accessor. ─────────
  const columnHelper = createColumnHelper<MemberRow>();

  const columns = useMemo(
    () =>
      [
        columnHelper.accessor("name", {
          header: "Profile",
          cell: ({ row }) => (
            <div className="flex items-center gap-3">
              <Avatar
                name={row.original.name}
                image={row.original.image}
                size={32}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {row.original.name}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {row.original.email}
                </p>
              </div>
            </div>
          ),
        }),
        columnHelper.accessor("role", {
          header: "Role",
          cell: ({ row }) => (
            <RoleCell
              member={row.original}
              orgId={orgId}
              myRole={myRole}
              myUserId={myUserId}
              onRoleChange={() =>
                void utils.orgMember.getMembers.invalidate({ orgId })
              }
            />
          ),
        }),
        columnHelper.display({
          id: "projects",
          header: "Projects",
          cell: ({ row }) => <ProjectsCell member={row.original} />,
        }),
        columnHelper.accessor("createdAt", {
          header: "Joined",
          cell: ({ getValue }) => (
            <span className="text-muted-foreground text-sm">
              {formatDate(getValue())}
            </span>
          ),
        }),
        columnHelper.display({
          id: "actions",
          header: "",
          cell: ({ row }) => (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setActionMember(row.original)}
            >
              <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
            </Button>
          ),
        }),
      ] as ColumnDef<MemberRow, unknown>[], // ← single cast at the array level
    [columnHelper, orgId, myRole, myUserId, utils.orgMember.getMembers],
  );

  const table = useReactTable({
    data: members,
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
          placeholder="Search members..."
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
                      <div className="flex flex-col gap-1">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-3 w-36" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-28" />
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
            ) : members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center">
                  <p className="text-muted-foreground text-sm">
                    {search
                      ? "No members match your search."
                      : "No active members."}
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

      {actionMember && (
        <ActionDialog
          open={!!actionMember}
          onOpenChange={(v) => {
            if (!v) setActionMember(null);
          }}
          member={actionMember}
          orgId={orgId}
          myRole={myRole}
          myUserId={myUserId}
          onDone={() => setActionMember(null)}
        />
      )}
    </div>
  );
};
