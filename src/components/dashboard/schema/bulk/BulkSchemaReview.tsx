"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  CheckmarkCircle02Icon,
  AlertCircleIcon,
  Upload04Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { BulkSchemaTabItem } from "./BulkSchemaTabItem";
import type { BulkSchemaItem } from "./BulkSchemaTabItem";
import type { ParsedSchemaFile } from "./BulkSchemaUploader";
import { cn, slugify } from "~/lib/utils";

interface Props {
  files: ParsedSchemaFile[];
  projectId: string;
  orgId: string;
  onDone: (result: {
    created: number;
    failed: { title: string; reason: string }[];
  }) => void;
  onBack: () => void;
}

export const BulkSchemaReview: React.FC<Props> = ({
  files,
  projectId,
  orgId,
  onDone,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [items, setItems] = useState<BulkSchemaItem[]>([]);

  const utils = api.useUtils();

  // ── Fetch existing schemas for conflict detection ─────────────────────────
  const { data: existingSchemasResponse } = api.cmsSchema.getAll.useQuery(
    { projectId, orgId, page: 1, limit: 100 },
    { enabled: !!projectId && !!orgId },
  );

  const existingSlugs = new Set(
    (existingSchemasResponse?.data?.items ?? []).map((s) => s.slug),
  );

  // ── Initialise items from parsed files + check intra-batch duplicates ─────
  useEffect(() => {
    const initialItems: BulkSchemaItem[] = files.map((f) => ({
      title: f.fileName,
      description: "",
      rawJson: f.rawJson,
      structure: f.structure,
      parseError: f.parseError,
      titleError: null,
    }));

    const slugCounts = new Map<string, number>();
    for (const item of initialItems) {
      const slug = slugify(item.title);
      slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1);
    }

    setItems(
      initialItems.map((item) => {
        const slug = slugify(item.title);
        if ((slugCounts.get(slug) ?? 0) > 1) {
          return {
            ...item,
            titleError: `"${item.title}" is already used in this batch`,
          };
        }
        return item;
      }),
    );
  }, [files]);

  // ── Mark items conflicting with existing project schemas ──────────────────
  // Runs once when existing schemas load, then again if items change length
  useEffect(() => {
    if (!existingSchemasResponse?.data) return;

    setItems((prev) =>
      prev.map((item) => {
        const slug = slugify(item.title);
        const isExistingConflict = existingSlugs.has(slug);
        const isCurrentlyExistingError =
          item.titleError?.includes("already exists in this project") ?? false;

        if (isExistingConflict) {
          return {
            ...item,
            titleError: `Schema with the title "${item.title}" already exists in this project. Please remove this file or update the title`,
          };
        }

        // Clear a stale existing-schema error if the slug no longer conflicts
        // (e.g. user renamed the title)
        if (isCurrentlyExistingError) {
          return { ...item, titleError: null };
        }

        return item;
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingSchemasResponse?.data, items.length]);

  // ── Mutation ──────────────────────────────────────────────────────────────
  const { mutate: bulkCreate, isPending: isSubmitting } =
    api.cmsSchema.bulkCreate.useMutation({
      onError: () => toast.error("Bulk creation failed. Please try again."),
      onSuccess: (res) => {
        if (res.error) {
          toast.error(res.error.message);

          // Feed existing-schema server errors back into item-level state
          const message = res.error.message ?? "";
          if (message.includes("already exist")) {
            // Server error format:
            // "The following schemas already exist in this project: "Title1", "Title2"."
            const matches = message.match(/"([^"]+)"/g);
            const conflictingTitles = new Set(
              (matches ?? []).map((m) => m.replace(/"/g, "").toLowerCase()),
            );

            let firstConflictIndex = -1;

            setItems((prev) =>
              prev.map((item, i) => {
                if (conflictingTitles.has(item.title.toLowerCase().trim())) {
                  if (firstConflictIndex === -1) firstConflictIndex = i;
                  return {
                    ...item,
                    titleError: `Schema with the title "${item.title}" already exists in this project. Please remove this file or update the title`,
                  };
                }
                return item;
              }),
            );

            // Navigate to the first conflicting tab
            if (firstConflictIndex !== -1) {
              setActiveTab(firstConflictIndex);
            }
          }
          return;
        }

        void utils.cmsSchema.getAll.invalidate();
        onDone({ created: res.data.created, failed: res.data.failed });
      },
    });

  // ── Item change ───────────────────────────────────────────────────────────
  const handleItemChange = (index: number, updated: BulkSchemaItem) => {
    setItems((prev) => prev.map((item, i) => (i === index ? updated : item)));
  };

  // ── Delete item + revalidate remaining ────────────────────────────────────
  const handleDeleteItem = (index: number) => {
    setItems((prev) => {
      const next = prev.filter((_, i) => i !== index);

      const slugCounts = new Map<string, number>();
      for (const item of next) {
        const slug = slugify(item.title);
        slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1);
      }

      const revalidated = next.map((item) => {
        const slug = slugify(item.title);
        const isDuplicate = (slugCounts.get(slug) ?? 0) > 1;
        const isExisting = existingSlugs.has(slug);

        let titleError: string | null = null;
        if (!item.title.trim()) {
          titleError = "Title is required";
        } else if (isDuplicate) {
          titleError = `"${item.title}" is already used in this batch`;
        } else if (isExisting) {
          titleError = `Schema with the title "${item.title}" already exists in this project. Please remove this file or update the title`;
        }

        return { ...item, titleError };
      });

      if (activeTab >= revalidated.length) {
        setActiveTab(Math.max(0, revalidated.length - 1));
      }

      return revalidated;
    });
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    const validItems = items.filter(
      (item) => item.structure !== null && !item.titleError,
    );

    if (validItems.length === 0) {
      toast.error("No valid schemas to create. Fix the errors first.");
      return;
    }

    const titles = validItems.map((i) => i.title.toLowerCase().trim());
    if (titles.length !== new Set(titles).size) {
      toast.error(
        "Some schemas have duplicate titles. Fix them before submitting.",
      );
      return;
    }

    bulkCreate({
      projectId,
      orgId,
      items: validItems.map((item) => ({
        title: item.title.trim(),
        description: item.description.trim() || undefined,
        schemaStructure: item.structure!,
      })),
    });
  };

  // ── Derived state ─────────────────────────────────────────────────────────
  const validCount = items.filter(
    (item) => item.structure !== null && !item.titleError,
  ).length;
  const invalidCount = items.length - validCount;
  const canSubmit = validCount > 0 && !isSubmitting;

  // if (items.length === 0) {
  //   onBack();
  //   return null;
  // }

  // useEffect(() => {
  //   if (items.length === 0 && files.length > 0) {
  //     onBack();
  //   }
  // }, [items.length]);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Summary bar ───────────────────────────────────────────────────── */}
      <div className="bg-card flex items-center justify-between rounded-2xl border px-5 py-4">
        <div className="flex items-center gap-4">
          <div>
            <section className="flex items-center gap-3">
              <h3 className="font-medium">
                Review {items.length} Schema{items.length === 1 ? "" : "s"}
              </h3>
              <div className="flex items-center gap-2">
                {validCount > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} />
                    {validCount} valid
                  </span>
                )}
                {invalidCount > 0 && (
                  <span className="bg-destructive/10 text-destructive flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium">
                    <HugeiconsIcon icon={AlertCircleIcon} size={12} />
                    {invalidCount} invalid
                  </span>
                )}
              </div>
            </section>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Edit titles and JSON before creating. Only valid schemas will be
              submitted.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            disabled={isSubmitting}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} />
            Back
          </Button>
          <Button
            size="sm"
            disabled={!canSubmit}
            isLoading={isSubmitting}
            onClick={handleSubmit}
          >
            <HugeiconsIcon icon={Upload04Icon} />
            Create {validCount} Schema{validCount === 1 ? "" : "s"}
          </Button>
        </div>
      </div>

      {/* ── Tab strip + content ───────────────────────────────────────────── */}
      <div className="bg-card w-full rounded-2xl border">
        <div className="flex w-full min-w-0 overflow-x-scroll border-b">
          {items.map((item, i) => {
            const isValid = item.structure !== null && !item.titleError;
            return (
              <div
                key={i}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 border-b-2 transition-colors",
                  activeTab === i ? "border-primary" : "border-transparent",
                )}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab(i)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-3 text-sm",
                    activeTab === i
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      isValid ? "bg-green-500" : "bg-destructive",
                    )}
                  />
                  <span className="max-w-32 truncate">
                    {item.title || `Schema ${i + 1}`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteItem(i);
                  }}
                  className="text-muted-foreground hover:text-destructive mr-2 transition-colors"
                  aria-label={`Remove ${item.title}`}
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={12} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="p-5">
          {items[activeTab] && (
            <BulkSchemaTabItem
              item={items[activeTab]}
              index={activeTab}
              usedTitles={items
                .filter((_, i) => i !== activeTab)
                .map((item) => item.title)}
              onChange={handleItemChange}
            />
          )}
        </div>
      </div>
    </div>
  );
};
