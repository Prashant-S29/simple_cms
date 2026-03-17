"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  UserAdd01Icon,
  Mail01Icon,
  CopyIcon,
  Edit03Icon,
  Tick02Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { ResourceHandler } from "~/components/common";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { FormDialog } from "~/components/common";
import { InviteMemberForm } from "~/components/dashboard/team/InviteMemberForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { api } from "~/trpc/react";
import type { OrgRole } from "~/lib/permissions";

import { TeamMembersTable } from "~/components/dashboard/team/TeamMembersTable";
import { TeamInvitationsTable } from "~/components/dashboard/team/TeamInvitationsTable";

// ─── Settings Page ────────────────────────────────────────────────────────────

interface Props {
  slug: string;
  userId: string;
}

export const SettingsPage: React.FC<Props> = ({ slug, userId }) => {
  const { data: response, isLoading } = api.org.getBySlug.useQuery({ slug });

  if (isLoading) {
    return (
      <div className="w-full pt-25">
        <div className="container mx-auto flex w-full flex-col gap-5">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-full max-w-xl" />
          <div className="grid grid-cols-4 gap-5">
            <Skeleton className="h-30 w-full" />
            <Skeleton className="h-30 w-full" />
            <Skeleton className="h-30 w-full" />
            <Skeleton className="h-30 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!response || response.error) {
    return <ResourceHandler state="not_found" />;
  }

  const org = response.data;
  const isOwner = org.myRole === "owner";
  const canManageTeam = org.myRole === "owner" || org.myRole === "admin";

  return (
    <div className="flex w-full flex-col py-25">
      <div className="container mx-auto flex w-full flex-col gap-5">
        <h1 className="text-2xl">
          {org.name}
          <span className="text-muted-foreground">&apos;s Settings</span>
        </h1>

        {/* ── Section 1: Org Settings ── */}
        <div>
          <div className="bg-card flex items-center justify-between rounded-t-2xl border p-5">
            <section>
              <h3>Organization Settings</h3>
              <p className="text-muted-foreground text-sm">
                Manage your Organization
              </p>
            </section>
            <Button
              variant="outline"
              render={
                <Link href={`/dashboard/org/${slug}`}>Back to Dashboard</Link>
              }
              nativeButton={false}
            />
          </div>

          <div className="bg-card grid grid-cols-2 gap-5 overflow-hidden rounded-b-2xl border border-t-0 p-5">
            {/* Org fields */}
            <div className="bg-muted overflow-hidden rounded-2xl">
              <div className="flex w-full flex-col gap-4 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <OrgNameEditor
                    orgId={org.id}
                    orgName={org.name}
                    isOwner={isOwner}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Invite Code</span>
                  <CopyableInviteCode code={org.inviteCode} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Your Role</span>
                  <span className="capitalize">{org.myRole}</span>
                </div>
              </div>
            </div>

            {/* Danger Zone (owner) | Team Summary (manager) | empty (admin) */}
            {isOwner ? (
              <div className="bg-muted rounded-xl p-5">
                <h2 className="font-medium text-red-600">Danger Zone</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Deleting this organization will permanently remove all
                  projects and data associated with it. This action cannot be
                  undone.
                </p>
                <div className="mt-4">
                  <DeleteOrgButton
                    orgId={org.id}
                    orgName={org.name}
                    orgSlug={org.slug}
                  />
                </div>
              </div>
            ) : !canManageTeam ? (
              <TeamSummaryPanel slug={slug} />
            ) : null}
          </div>
        </div>

        {/* ── Section 2: Team Settings (owner + admin only) ── */}
        {canManageTeam && (
          <div>
            <div className="bg-card flex items-center justify-between rounded-t-2xl border p-5">
              <section>
                <h3>Team Settings</h3>
                <p className="text-muted-foreground text-sm">
                  Manage members and invitations
                </p>
              </section>
            </div>

            <div className="bg-card overflow-hidden rounded-b-2xl border border-t-0 p-5">
              <TeamManagePanel
                orgId={org.id}
                orgName={org.name}
                orgSlug={org.slug}
                inviteCode={org.inviteCode}
                myRole={org.myRole}
                myUserId={userId}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Team Summary Panel (manager read-only view) ──────────────────────────────

const TeamSummaryPanel: React.FC<{ slug: string }> = ({ slug }) => {
  const { data: response, isLoading } = api.org.getOrgTeamBySlug.useQuery({
    slug,
    page: 1,
    limit: 10,
  });

  if (isLoading) {
    return (
      <div className="bg-muted flex w-full flex-col items-center justify-center gap-4 rounded-xl p-5">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  if (!response || response.error) {
    return (
      <div className="bg-muted flex w-full items-center justify-center rounded-xl p-5">
        <p className="text-muted-foreground text-sm">Could not load team.</p>
      </div>
    );
  }

  const { totalMembers, avatarMembers } = response.data;

  return (
    <div className="bg-muted flex w-full flex-col items-center justify-center gap-4 rounded-xl p-5">
      <div className="flex items-center gap-3">
        <div className="flex items-center">
          {avatarMembers.map((member, i) => (
            <div
              key={member.id}
              className="border-background size-9 overflow-hidden rounded-full border-2"
              style={{
                marginLeft: i === 0 ? 0 : "-0.75rem",
                zIndex: avatarMembers.length - i,
                position: "relative",
              }}
            >
              {member.image ? (
                <img
                  src={member.image}
                  alt={member.name ?? "Member"}
                  className="size-full object-cover"
                />
              ) : (
                <div className="bg-primary text-primary-foreground flex size-full items-center justify-center text-xs font-semibold uppercase">
                  {(member.name ?? "?").charAt(0)}
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="text-sm font-medium">
          {totalMembers} {totalMembers === 1 ? "Member" : "Members"}
        </p>
      </div>
    </div>
  );
};

// ─── Team Manage Panel ────────────────────────────────────────────────────────

interface TeamManagePanelProps {
  orgId: string;
  orgName: string;
  orgSlug: string;
  inviteCode: string;
  myRole: OrgRole;
  myUserId: string;
}

const TeamManagePanel: React.FC<TeamManagePanelProps> = ({
  orgId,
  orgName,
  orgSlug,
  inviteCode,
  myRole,
  myUserId,
}) => {
  const [activeTab, setActiveTab] = useState<"members" | "invitations">(
    "members",
  );
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      {/* Header row: invite code + invite button */}
      <div className="flex items-center justify-between">
        <div className="bg-muted flex items-center gap-2 rounded-lg border px-3 py-2">
          <HugeiconsIcon
            icon={Mail01Icon}
            size={14}
            className="text-muted-foreground shrink-0"
          />
          <span className="text-muted-foreground font-mono text-xs font-semibold tracking-widest">
            {inviteCode}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 shrink-0 text-xs"
            onClick={() => {
              void navigator.clipboard.writeText(inviteCode);
              toast.success("Invite code copied!");
            }}
          >
            Copy
          </Button>
        </div>

        <FormDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          trigger={
            <Button size="sm">
              <HugeiconsIcon icon={UserAdd01Icon} size={14} />
              Invite Member
            </Button>
          }
          title="Invite a Member"
          desc={`Send an invitation email to add someone to ${orgName}.`}
          form={
            <InviteMemberForm
              orgId={orgId}
              onSuccess={() => setInviteOpen(false)}
            />
          }
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(["members", "invitations"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "text-foreground -mb-px border-b-2 border-current px-4"
                : "text-muted-foreground hover:text-foreground px-4"
            }`}
          >
            {tab === "members" ? "Members" : "Invitations History"}
          </button>
        ))}
      </div>

      {/* Tab content — table components */}
      {activeTab === "members" ? (
        <TeamMembersTable
          orgId={orgId}
          orgSlug={orgSlug}
          myRole={myRole}
          myUserId={myUserId}
        />
      ) : (
        <TeamInvitationsTable orgId={orgId} />
      )}
    </div>
  );
};

// ─── Inline Org Name Editor ───────────────────────────────────────────────────

interface OrgNameEditorProps {
  orgId: string;
  orgName: string;
  isOwner: boolean;
}

const OrgNameEditor: React.FC<OrgNameEditorProps> = ({
  orgId,
  orgName,
  isOwner,
}) => {
  const utils = api.useUtils();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(orgName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setValue(orgName);
  }, [orgName, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const { mutate: updateOrg, isPending } = api.org.update.useMutation({
    onSuccess: (res) => {
      if (res.error) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Organization name updated.");
      void utils.org.getBySlug.invalidate();
      void utils.org.getAll.invalidate();
      setEditing(false);
    },
    onError: () => toast.error("Failed to update name. Please try again."),
  });

  const handleConfirm = () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === orgName) {
      setEditing(false);
      setValue(orgName);
      return;
    }
    updateOrg({ id: orgId, name: trimmed });
  };

  const handleCancel = () => {
    setValue(orgName);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") handleCancel();
  };

  if (!isOwner) return <span>{orgName}</span>;

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span>{orgName}</span>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setEditing(true)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Edit organization name"
        >
          <HugeiconsIcon icon={Edit03Icon} />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isPending}
        className="h-7 w-50 py-0 text-sm"
      />
      <section className="flex items-center">
        <Button
          size="icon"
          variant="ghost"
          onClick={handleConfirm}
          disabled={isPending}
          className="text-green-600 transition-colors hover:text-green-700 disabled:opacity-50"
        >
          <HugeiconsIcon icon={Tick02Icon} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={handleCancel}
          disabled={isPending}
          className="text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50"
        >
          <HugeiconsIcon icon={Cancel01Icon} />
        </Button>
      </section>
    </div>
  );
};

// ─── Copyable Invite Code ─────────────────────────────────────────────────────

const CopyableInviteCode: React.FC<{ code: string }> = ({ code }) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Invite code copied to clipboard!");
    } catch {
      toast.error("Failed to copy. Please copy it manually.");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <p>{code}</p>
      <Button
        size="icon"
        variant="ghost"
        aria-label="copy"
        className="text-muted-foreground hover:text-foreground transition-colors"
        onClick={handleCopy}
      >
        <HugeiconsIcon icon={CopyIcon} />
      </Button>
    </div>
  );
};

// ─── Delete Org Button ────────────────────────────────────────────────────────

interface DeleteOrgButtonProps {
  orgId: string;
  orgName: string;
  orgSlug: string;
}

const DeleteOrgButton: React.FC<DeleteOrgButtonProps> = ({
  orgId,
  orgName,
  orgSlug,
}) => {
  const router = useRouter();
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  const [confirmValue, setConfirmValue] = useState("");
  const slugMatches = confirmValue === orgSlug;

  const { mutate: deleteOrg, isPending } = api.org.delete.useMutation({
    onSuccess: (res) => {
      if (res.error) {
        toast.error(res.error.message);
        return;
      }
      toast.success(`"${orgName}" has been deleted.`);
      void utils.org.getAll.invalidate();
      router.push("/dashboard");
    },
    onError: () =>
      toast.error("Failed to delete organization. Please try again."),
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) setConfirmValue("");
    setOpen(next);
  };

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Delete Organization
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete &quot;{orgName}&quot;</DialogTitle>
            <DialogDescription>
              This will permanently delete the organization along with all
              associated projects and data.{" "}
              <strong>This action cannot be undone.</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm">
              Please type{" "}
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs font-semibold">
                {orgSlug}
              </code>{" "}
              to confirm.
            </p>
            <Input
              value={confirmValue}
              onChange={(e) => setConfirmValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && slugMatches) deleteOrg({ id: orgId });
              }}
              placeholder={orgSlug}
              disabled={isPending}
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!slugMatches || isPending}
              isLoading={isPending}
              onClick={() => deleteOrg({ id: orgId })}
            >
              Delete Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
