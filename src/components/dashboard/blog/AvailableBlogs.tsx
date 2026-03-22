"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlusSignIcon,
  Search01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Delete02Icon,
  Edit03Icon,
  FileEditIcon,
} from "@hugeicons/core-free-icons";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { Field, FieldLabel, FieldError } from "~/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "~/components/ui/dialog";
import { useDebounce } from "~/hooks";
import { formatDate, slugify } from "~/lib/utils";
import { cn } from "~/lib/utils";
import { PAGINATION_LIMIT } from "~/lib/constants";
import type { OrgRole } from "~/lib/permissions";

interface Props {
  projectId: string;
  projectSlug: string;
  orgSlug: string;
  orgId: string;
  myRole: OrgRole;
}

export const AvailableBlogs: React.FC<Props> = ({
  projectId,
  projectSlug,
  orgSlug,
  orgId,
  myRole,
}) => {
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    slug: string;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const canManage = myRole === "owner" || myRole === "admin";
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const utils = api.useUtils();

  const {
    data: response,
    isLoading,
    isFetching,
  } = api.blogPost.getAll.useQuery({
    projectId,
    orgId,
    page,
    limit: PAGINATION_LIMIT,
    search: debouncedSearch || undefined,
  });

  const { mutate: deletePost, isPending: isDeleting } =
    api.blogPost.delete.useMutation({
      onError: () => toast.error("Failed to delete post."),
      onSuccess: (res) => {
        if (res.error) {
          toast.error(res.error.message);
          return;
        }
        toast.success(res.message ?? "Post deleted.");
        setDeleteTarget(null);
        void utils.blogPost.getAll.invalidate();
      },
    });

  const posts = response?.data?.items ?? [];
  const total = response?.data?.total ?? 0;
  const hasNext = response?.data?.hasNext ?? false;
  const hasPrev = page > 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGINATION_LIMIT));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGINATION_LIMIT + 1;
  const rangeEnd = Math.min(page * PAGINATION_LIMIT, total);

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-secondary sticky top-0 z-10 flex w-full items-center justify-between border-b px-4 py-3">
        <section>
          <h3>Blog Posts</h3>
          <p className="text-muted-foreground text-sm">
            Create and manage blog post identities for this project.
          </p>
        </section>
        <section className="flex items-center gap-2">
          <div className="relative">
            <HugeiconsIcon
              icon={Search01Icon}
              size={16}
              className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
            />
            <Input
              className="h-8 w-48 pl-8 text-sm"
              placeholder="Search slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {canManage && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <HugeiconsIcon icon={PlusSignIcon} />
              New Post
            </Button>
          )}
        </section>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="p-3">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <HugeiconsIcon
              icon={FileEditIcon}
              size={32}
              className="text-muted-foreground"
            />
            <div>
              <h3 className="font-medium">
                {debouncedSearch
                  ? `No posts matching "${debouncedSearch}"`
                  : "No blog posts yet"}
              </h3>
              <p className="text-muted-foreground mt-1 text-sm">
                {canManage
                  ? "Create your first post to get started."
                  : "No posts have been created yet."}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {posts.map((post) => (
              <PostRow
                key={post.id}
                post={post}
                orgSlug={orgSlug}
                projectSlug={projectSlug}
                orgId={orgId}
                canManage={canManage}
                onDelete={() =>
                  setDeleteTarget({ id: post.id, slug: post.slug })
                }
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="text-muted-foreground mt-3 flex items-center justify-between border-t pt-3 text-sm">
            <span>
              Showing {rangeStart}–{rangeEnd} of {total}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={!hasPrev || isFetching}
                onClick={() => setPage((p) => p - 1)}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} />
              </Button>
              <span className="tabular-nums">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={!hasNext || isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                <HugeiconsIcon icon={ArrowRight01Icon} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────────────── */}
      {canManage && (
        <CreateBlogPostDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          projectId={projectId}
          orgId={orgId}
        />
      )}

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete &quot;{deleteTarget?.slug}&quot;</DialogTitle>
            <DialogDescription>
              This will permanently delete the post and all its content across
              all locales. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              isLoading={isDeleting}
              onClick={() =>
                deleteTarget &&
                deletePost({
                  id: deleteTarget.id,
                  projectId,
                  orgId,
                })
              }
            >
              Delete Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ─── Post row ─────────────────────────────────────────────────────────────────

type PostLocale = {
  locale: string;
  title: string | null;
  status: "draft" | "published";
  isActive: boolean;
  publishedAt: Date | null;
};

const PostRow: React.FC<{
  post: {
    id: string;
    slug: string;
    createdAt: Date;
    locales: PostLocale[];
  };
  orgSlug: string;
  projectSlug: string;
  orgId: string;
  canManage: boolean;
  onDelete: () => void;
}> = ({ post, orgSlug, projectSlug, orgId, canManage, onDelete }) => {
  const href = `/dashboard/org/${orgSlug}/project/${projectSlug}/blog/${post.slug}?orgId=${orgId}`;

  return (
    <div className="bg-card flex items-center justify-between rounded-xl border px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <code className="text-sm font-medium">{post.slug}</code>
            {/* Locale status badges */}
            <div className="flex items-center gap-1">
              {post.locales.map((l) => (
                <span
                  key={l.locale}
                  className={cn(
                    "rounded-full px-1.5 py-0.5 font-mono text-xs",
                    !l.isActive
                      ? "bg-muted text-muted-foreground"
                      : l.status === "published"
                        ? "bg-green-500/10 text-green-600"
                        : "bg-amber-500/10 text-amber-600",
                  )}
                  title={`${l.locale}: ${!l.isActive ? "inactive" : l.status}`}
                >
                  {l.locale}
                </span>
              ))}
              {post.locales.length === 0 && (
                <span className="text-muted-foreground text-xs">
                  No content yet
                </span>
              )}
            </div>
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Created {formatDate(post.createdAt)}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          size="icon-xs"
          variant="ghost"
          className="text-muted-foreground"
          nativeButton={false}
          render={<a href={href} />}
          aria-label="Edit post"
        >
          <HugeiconsIcon icon={Edit03Icon} size={13} />
        </Button>
        {canManage && (
          <Button
            size="icon-xs"
            variant="ghost"
            className="text-destructive hover:text-destructive/80"
            onClick={onDelete}
            aria-label="Delete post"
          >
            <HugeiconsIcon icon={Delete02Icon} size={13} />
          </Button>
        )}
      </div>
    </div>
  );
};

// ─── Create dialog ────────────────────────────────────────────────────────────

const CreateBlogPostDialog: React.FC<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  orgId: string;
}> = ({ open, onOpenChange, projectId, orgId }) => {
  const utils = api.useUtils();
  const [slugInput, setSlugInput] = useState("");
  const [slugError, setSlugError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSlugInput("");
      setSlugError(null);
    }
  }, [open]);

  const preview = slugInput.trim() ? slugify(slugInput.trim()) : "";

  const { mutate: createPost, isPending } = api.blogPost.create.useMutation({
    onError: () => toast.error("Failed to create post."),
    onSuccess: (res) => {
      if (res.error) {
        toast.error(res.error.message);
        return;
      }
      toast.success(res.message ?? "Post created.");
      onOpenChange(false);
      void utils.blogPost.getAll.invalidate();
    },
  });

  const handleConfirm = () => {
    const slug = slugInput.trim();
    if (!slug) {
      setSlugError("Slug is required");
      return;
    }
    createPost({ projectId, orgId, slug });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Blog Post</DialogTitle>
          <DialogDescription>
            Set a URL slug for this post. The title and content are added by the
            manager.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Field data-invalid={!!slugError}>
            <FieldLabel htmlFor="post-slug">Slug</FieldLabel>
            <Input
              id="post-slug"
              value={slugInput}
              onChange={(e) => {
                setSlugInput(e.target.value);
                setSlugError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirm();
              }}
              placeholder="my-first-post"
              autoComplete="off"
              autoFocus
            />
            {preview && slugInput !== preview && (
              <p className="text-muted-foreground mt-1 text-xs">
                Will be saved as:{" "}
                <code className="bg-muted rounded px-1 font-mono">
                  {preview}
                </code>
              </p>
            )}
            {slugError && <FieldError errors={[{ message: slugError }]} />}
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
            disabled={!slugInput.trim() || isPending}
            isLoading={isPending}
          >
            Create Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
