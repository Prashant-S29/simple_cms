"use client";

import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { ResourceHandler } from "~/components/common";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { FloppyDiskIcon, Alert02Icon } from "@hugeicons/core-free-icons";
import {
  ContentForm,
  JsonContentPanel,
} from "~/components/dashboard/project/manager";
import { getLocaleFlag } from "~/lib/locales";
import { cn } from "~/lib/utils";
import type { SchemaStructure } from "~/zodSchema/cmsSchema";

interface Props {
  projectSlug: string;
  orgSlug: string;
  orgId: string;
  schemaSlug: string;
}

const SchemaContentPage: React.FC<Props> = ({
  projectSlug,
  orgId,
  schemaSlug,
}) => {
  const { data: projectResponse, isLoading: isProjectLoading } =
    api.project.getBySlug.useQuery({ slug: projectSlug, orgId });

  const projectId = projectResponse?.data?.id ?? "";

  const { data: langsResponse, isLoading: isLangsLoading } =
    api.projectLanguage.getAll.useQuery(
      { projectId, orgId },
      { enabled: !!projectId },
    );

  const activeLanguages = (langsResponse?.data ?? []).filter(
    (l) => l.status === "active",
  );

  const defaultLocale =
    activeLanguages.find((l) => l.locale === "en")?.locale ??
    activeLanguages[0]?.locale ??
    "en";

  const [activeLocale, setActiveLocale] = useState(defaultLocale);

  useEffect(() => {
    if (
      activeLanguages.length > 0 &&
      !activeLanguages.find((l) => l.locale === activeLocale)
    ) {
      setActiveLocale(defaultLocale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [langsResponse]);

  const isLoading = isProjectLoading || isLangsLoading;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!projectResponse?.data || projectResponse.error) {
    return <ResourceHandler state="not_found" />;
  }

  if (activeLanguages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <HugeiconsIcon
          icon={Alert02Icon}
          size={32}
          className="text-amber-500"
        />
        <h2 className="font-medium">No active languages</h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          Ask your admin to configure and enable languages for this project
          before you can add content.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Locale tabs ─────────────────────────────────────────────────────── */}
      <div className="bg-muted sticky top-0 z-20 border-b">
        <div className="flex items-center overflow-x-auto">
          {activeLanguages.map((lang) => (
            <button
              key={lang.locale}
              type="button"
              onClick={() => setActiveLocale(lang.locale)}
              className={cn(
                "flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm transition-colors",
                activeLocale === lang.locale
                  ? "border-primary text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground border-transparent",
              )}
            >
              <span>{getLocaleFlag(lang.locale)}</span>
              <span>{lang.label}</span>
              {lang.isDefault && (
                <span className="bg-primary/10 text-primary rounded-full px-1.5 py-0.5 text-xs">
                  Default
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        <LocaleContentForm
          key={`${schemaSlug}-${activeLocale}`}
          schemaSlug={schemaSlug}
          projectId={projectId}
          orgId={orgId}
          locale={activeLocale}
        />
      </div>
    </div>
  );
};

export default SchemaContentPage;

interface LocaleContentFormProps {
  schemaSlug: string;
  projectId: string;
  orgId: string;
  locale: string;
}

const LocaleContentForm: React.FC<LocaleContentFormProps> = ({
  schemaSlug,
  projectId,
  orgId,
  locale,
}) => {
  const utils = api.useUtils();

  const { data: response, isLoading } = api.cmsContent.getOrInit.useQuery({
    schemaSlug,
    projectId,
    orgId,
    locale,
  });

  const [formData, setFormData] = useState<Record<string, unknown> | null>(
    null,
  );
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (response?.data?.content) {
      setFormData(response.data.content as Record<string, unknown>);
      setIsDirty(false);
    }
  }, [response]);

  const { mutate: save, isPending: isSaving } = api.cmsContent.save.useMutation(
    {
      onError: () => toast.error("Failed to save. Please try again."),
      onSuccess: (res) => {
        if (res.error) {
          toast.error(res.error.message);
          return;
        }
        toast.success("Content saved.");
        setIsDirty(false);
        void utils.cmsContent.getOrInit.invalidate();
      },
    },
  );

  const handleDataChange = useCallback((updated: Record<string, unknown>) => {
    setFormData(updated);
    setIsDirty(true);
  }, []);

  const handleSave = () => {
    if (!formData || !response?.data) return;
    save({
      schemaId: response.data.schemaId,
      projectId,
      orgId,
      locale,
      content: formData,
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!response?.data || response.error) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <HugeiconsIcon
          icon={Alert02Icon}
          size={28}
          className="text-amber-500"
        />
        <p className="text-muted-foreground text-sm">
          {response?.error?.message ?? "Could not load content."}
        </p>
      </div>
    );
  }

  const { schemaTitle, schemaStructure, isNew, updatedAt } = response.data;

  return (
    <div className="flex flex-col gap-5">
      {/* ── Header with single save button ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-medium capitalize">{schemaTitle}</h1>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {isNew
              ? "No content saved yet — fill the form and save."
              : updatedAt
                ? `Last saved ${new Date(updatedAt).toLocaleString()}`
                : ""}
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          isLoading={isSaving}
        >
          <HugeiconsIcon icon={FloppyDiskIcon} />
          {isDirty ? "Save Changes" : "Saved"}
        </Button>
      </div>

      {/* ── Side by side: Form (left) + JSON editor (right) ─────────────────── */}
      {formData && (
        <div className="grid grid-cols-2 items-start gap-4">
          {/* Left — form UI */}
          <ContentForm
            structure={schemaStructure as SchemaStructure}
            data={formData}
            onChange={handleDataChange}
          />

          {/* Right — JSON panel */}
          <JsonContentPanel
            structure={schemaStructure as SchemaStructure}
            data={formData}
            onChange={handleDataChange}
            schemaSlug={schemaSlug}
          />
        </div>
      )}
    </div>
  );
};
