"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Field, FieldLabel, FieldError } from "~/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "~/components/ui/dialog";
import { slugify } from "~/lib/utils";
import { useDebounce } from "~/hooks";
import type { SchemaCardSchema } from "./SchemaCard";

export interface EditDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schema: SchemaCardSchema;
  projectId: string;
  orgId: string;
  orgSlug: string;
  projectSlug: string;
}

export const EditDialog: React.FC<EditDialogProps> = ({
  open,
  onOpenChange,
  schema,
  projectId,
  orgId,
  orgSlug,
  projectSlug,
}) => {
  const router = useRouter();
  const utils = api.useUtils();
  const [title, setTitle] = useState(schema.title);
  const [description, setDescription] = useState(schema.description ?? "");
  const [titleError, setTitleError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedTitle = useDebounce(title, 400);
  const newSlug = slugify(debouncedTitle.trim());
  const slugChanged = newSlug !== schema.slug;

  useEffect(() => {
    if (open) {
      setTitle(schema.title);
      setDescription(schema.description ?? "");
      setTitleError(null);
    }
  }, [open, schema.title, schema.description]);

  const { data: slugCheckResponse, isFetching: isCheckingSlug } =
    api.cmsSchema.getBySlug.useQuery(
      { slug: newSlug, projectId, orgId },
      {
        enabled:
          open &&
          !!projectId &&
          slugChanged &&
          debouncedTitle.trim().length > 0,
      },
    );

  const slugConflict =
    slugChanged &&
    !isCheckingSlug &&
    slugCheckResponse?.data !== null &&
    !slugCheckResponse?.error;

  const { mutate: updateSchema, isPending } = api.cmsSchema.update.useMutation({
    onError: () => toast.error("Failed to update schema. Please try again."),
    onSuccess: (res) => {
      if (res.error) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Schema updated successfully.");
      void utils.cmsSchema.getAll.invalidate();
      onOpenChange(false);
      if (res.data!.slug !== schema.slug) {
        router.push(
          `/dashboard/org/${orgSlug}/project/${projectSlug}/admin/schema/${res.data!.slug}?orgId=${orgId}`,
        );
      }
    },
  });

  const handleConfirm = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError("Title is required");
      return;
    }
    if (trimmed.length > 100) {
      setTitleError("Max 100 characters");
      return;
    }
    if (slugConflict) {
      setTitleError("A schema with a similar name already exists");
      return;
    }

    const descTrimmed = description.trim();
    if (descTrimmed.length > 500) {
      setTitleError("Description max 500 characters");
      return;
    }

    const titleUnchanged = trimmed === schema.title;
    const descUnchanged = descTrimmed === (schema.description ?? "");
    if (titleUnchanged && descUnchanged) {
      onOpenChange(false);
      return;
    }

    updateSchema({
      id: schema.id,
      projectId,
      orgId,
      title: trimmed,
      description: descTrimmed || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Schema</DialogTitle>
          <DialogDescription>
            Update the title or description. Changing the title will also update
            the slug used in API URLs.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Title */}
          <Field data-invalid={!!titleError || slugConflict}>
            <FieldLabel htmlFor="edit-title">Title</FieldLabel>
            <Input
              ref={inputRef}
              id="edit-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirm();
                if (e.key === "Escape") onOpenChange(false);
              }}
              placeholder="e.g. About Us Page"
              autoComplete="off"
              aria-invalid={!!titleError || slugConflict}
              autoFocus
            />
            {/* Slug preview */}
            {debouncedTitle.trim() && (
              <p className="text-muted-foreground mt-1 text-xs">
                Slug:{" "}
                <code className="bg-muted rounded px-1 font-mono">
                  {newSlug}
                </code>
                {isCheckingSlug && <span className="ml-2">Checking...</span>}
                {slugConflict && (
                  <span className="text-destructive ml-2">Already taken</span>
                )}
                {!isCheckingSlug && !slugConflict && slugChanged && (
                  <span className="ml-2 text-green-600">Available</span>
                )}
              </p>
            )}
            {titleError && <FieldError errors={[{ message: titleError }]} />}
          </Field>

          {/* Description */}
          <Field>
            <FieldLabel htmlFor="edit-desc">
              Description{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </FieldLabel>
            <Textarea
              id="edit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What content does this schema manage?"
              rows={3}
              maxLength={500}
            />
            <p className="text-muted-foreground mt-1 text-right text-xs">
              {description.length}/500
            </p>
          </Field>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending || isCheckingSlug || slugConflict}
            isLoading={isPending}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schema: SchemaCardSchema;
  projectId: string;
  orgId: string;
}

export const DeleteDialog: React.FC<DeleteDialogProps> = ({
  open,
  onOpenChange,
  schema,
  projectId,
  orgId,
}) => {
  const utils = api.useUtils();
  const [confirmValue, setConfirmValue] = useState("");
  const slugMatches = confirmValue === schema.slug;

  useEffect(() => {
    if (!open) setConfirmValue("");
  }, [open]);

  const { mutate: deleteSchema, isPending } = api.cmsSchema.delete.useMutation({
    onError: () => toast.error("Failed to delete schema. Please try again."),
    onSuccess: (res) => {
      if (res.error) {
        toast.error(res.error.message);
        return;
      }
      toast.success(`"${schema.title}" has been deleted.`);
      void utils.cmsSchema.getAll.invalidate();
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete &quot;{schema.title}&quot;</DialogTitle>
          <DialogDescription>
            This will permanently delete the schema and all its structure. This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <p className="text-sm">
            Type{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs font-semibold">
              {schema.slug}
            </code>{" "}
            to confirm.
          </p>
          <Input
            value={confirmValue}
            onChange={(e) => setConfirmValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && slugMatches)
                deleteSchema({ id: schema.id, projectId, orgId });
            }}
            placeholder={schema.slug}
            disabled={isPending}
            autoFocus
          />
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!slugMatches || isPending}
            isLoading={isPending}
            onClick={() => deleteSchema({ id: schema.id, projectId, orgId })}
          >
            Delete Schema
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export interface ResetDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schema: SchemaCardSchema;
  projectId: string;
  orgId: string;
}

export const ResetDialog: React.FC<ResetDialogProps> = ({
  open,
  onOpenChange,
  schema,
  projectId,
  orgId,
}) => {
  const utils = api.useUtils();

  const { mutate: resetStructure, isPending } =
    api.cmsSchema.resetStructure.useMutation({
      onError: () => toast.error("Failed to reset schema. Please try again."),
      onSuccess: (res) => {
        if (res.error) {
          toast.error(res.error.message);
          return;
        }
        toast.success(`"${schema.title}" structure has been reset.`);
        void utils.cmsSchema.getAll.invalidate();
        void utils.cmsSchema.getBySlug.invalidate();
        onOpenChange(false);
      },
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset &quot;{schema.title}&quot;</DialogTitle>
          <DialogDescription>
            This will remove the entire schema structure, leaving the schema
            empty. The title and slug are preserved. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={isPending}
            isLoading={isPending}
            onClick={() => resetStructure({ id: schema.id, projectId, orgId })}
          >
            Reset Structure
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
