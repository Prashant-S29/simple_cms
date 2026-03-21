"use client";

import React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { api } from "~/trpc/react";
import { InviteMemberSchema } from "~/zodSchema/orgMember";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import { Skeleton } from "~/components/ui/skeleton";

type InviteFormValues = z.output<typeof InviteMemberSchema>;

interface Props {
  orgId: string;
  onSuccess?: () => void;
}

export const InviteMemberForm: React.FC<Props> = ({ orgId, onSuccess }) => {
  const utils = api.useUtils();

  const form = useForm<InviteFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(InviteMemberSchema) as any,
    defaultValues: {
      orgId,
      email: "",
      role: "admin",
      projectIds: [],
    },
  });

  const selectedRole = form.watch("role");
  const selectedProjectIds = form.watch("projectIds") ?? [];

  const { data: projectsResponse, isLoading: projectsLoading } =
    api.project.getAll.useQuery(
      { orgId, page: 1, limit: 50 },
      { enabled: selectedRole === "manager" },
    );

  const projects =
    (
      projectsResponse?.data as
        | { items: { id: string; name: string; slug: string }[] }
        | null
        | undefined
    )?.items ?? [];

  const { mutate: inviteMember, isPending } = api.orgMember.invite.useMutation({
    onSuccess: (response) => {
      if (response.error) {
        toast.error(response.error.message);
        return;
      }
      toast.success(response.message ?? "Invitation sent!");
      form.reset({ orgId, email: "", role: "admin", projectIds: [] });
      void utils.orgMember.getInvitations.invalidate({ orgId });
      onSuccess?.();
    },
    onError: () => {
      toast.error("Failed to send invitation. Please try again.");
    },
  });

  function onSubmit(data: InviteFormValues) {
    inviteMember(data);
  }

  function toggleProject(projectId: string) {
    const current = selectedProjectIds;
    const next = current.includes(projectId)
      ? current.filter((id) => id !== projectId)
      : [...current, projectId];
    form.setValue("projectIds", next, { shouldValidate: true });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      {/* Email */}
      <Controller
        name="email"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Email Address</FieldLabel>
            <Input
              {...field}
              id={field.name}
              type="email"
              aria-invalid={fieldState.invalid}
              placeholder="colleague@example.com"
              autoComplete="off"
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      {/* Role */}
      <Controller
        name="role"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="invite-role">Role</FieldLabel>
            <Select
              value={field.value}
              onValueChange={(val) => {
                field.onChange(val);
                if (val !== "manager") {
                  form.setValue("projectIds", []);
                }
              }}
            >
              <SelectTrigger id="invite-role" className="w-full">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex flex-col">
                    <span className="font-medium">Admin</span>
                    <span className="text-muted-foreground text-xs">
                      Full project access — cannot modify org settings
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="manager">
                  <div className="flex flex-col">
                    <span className="font-medium">Manager</span>
                    <span className="text-muted-foreground text-xs">
                      Access limited to specific projects only
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      {/* Project scoping — shown for manager, now optional */}
      {selectedRole === "manager" && (
        <Field>
          <FieldLabel>
            Project Access {/* ── removed "(required for manager)" label ── */}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </FieldLabel>

          {projectsLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-lg" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-muted rounded-lg border border-dashed px-4 py-3 text-center">
              <p className="text-muted-foreground text-sm">
                No projects in this organization yet.
              </p>
            </div>
          ) : (
            <div className="bg-muted/30 flex flex-col gap-1 rounded-lg border p-2">
              {projects.map((project) => {
                const isChecked = selectedProjectIds.includes(project.id);
                return (
                  <label
                    key={project.id}
                    className="hover:bg-muted flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleProject(project.id)}
                      id={`project-${project.id}`}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {project.name}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        /{project.slug}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          {/* ── removed the "select at least one" error message ── */}
          {selectedProjectIds.length > 0 && (
            <p className="text-muted-foreground text-xs">
              {selectedProjectIds.length}{" "}
              {selectedProjectIds.length === 1 ? "project" : "projects"}{" "}
              selected
            </p>
          )}
        </Field>
      )}

      {/* Role description hint */}
      <div className="bg-muted/40 text-muted-foreground rounded-lg px-3 py-2.5 text-xs">
        {selectedRole === "admin" ? (
          <>
            <strong className="text-foreground">Admin</strong> — can create,
            read, update, and delete all projects in this organization. Can also
            invite members and manage roles. Cannot update or delete the org
            itself.
          </>
        ) : (
          <>
            <strong className="text-foreground">Manager</strong> — can only
            access the specific projects you select above. If no projects are
            selected, the manager will have no project access until assigned.
          </>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <Button type="submit" isLoading={isPending}>
          Send Invitation
        </Button>
      </div>
    </form>
  );
};
