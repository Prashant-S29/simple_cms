"use client";

import React, { useEffect, useState } from "react";
import { ResourceHandler } from "~/components/common";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { FloppyDiskIcon } from "@hugeicons/core-free-icons";
import type { SchemaStructure } from "~/zodSchema/cmsSchema";
import {
  SchemaPreviewTree,
  JsonImportBuilder,
  SchemaSelector,
} from "~/components/dashboard/schema/builder";
import { ManualBuilder } from "~/components/dashboard/schema/builder/manual";

import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";

interface Props {
  projectSlug: string;
  orgSlug: string;
  orgId: string;
  schemaSlug: string;
}

type BuilderMode = "manual" | "json";
type ViewTab = "builder" | "preview";

const SchemaBuilderPage: React.FC<Props> = ({
  projectSlug,
  orgId,
  schemaSlug,
}) => {
  const [builderMode, setBuilderMode] = useState<BuilderMode>("manual");
  const [viewTab, setViewTab] = useState<ViewTab>("builder");
  const [draft, setDraft] = useState<SchemaStructure | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const { data: projectResponse, isLoading: isProjectLoading } =
    api.project.getBySlug.useQuery({ slug: projectSlug, orgId });

  const { data: schemaResponse, isLoading: isSchemaLoading } =
    api.cmsSchema.getBySlug.useQuery(
      {
        slug: schemaSlug,
        projectId: projectResponse?.data?.id ?? "",
        orgId,
      },
      {
        enabled: !!projectResponse?.data?.id,
      },
    );

  useEffect(() => {
    if (schemaResponse?.data?.schemaStructure && draft === null) {
      setDraft(schemaResponse.data.schemaStructure as SchemaStructure);
    }
  }, [schemaResponse]);

  const utils = api.useUtils();

  const { mutate: saveStructure, isPending: isSaving } =
    api.cmsSchema.saveStructure.useMutation({
      onError: () => toast.error("Failed to save schema. Please try again."),
      onSuccess: (res) => {
        if (res.error) {
          toast.error(res.error.message);
          return;
        }
        toast.success("Schema saved successfully.");
        setIsDirty(false);
        void utils.cmsSchema.getAll.invalidate();
        void utils.cmsSchema.getBySlug.invalidate();
      },
    });

  const handleSave = () => {
    if (!draft) {
      toast.error("Nothing to save yet.");
      return;
    }
    const projectId = projectResponse?.data?.id;
    const schemaId = schemaResponse?.data?.id;
    if (!projectId || !schemaId) return;

    saveStructure({ id: schemaId, projectId, orgId, schemaStructure: draft });
  };

  const handleDraftChange = (updated: SchemaStructure) => {
    setDraft(updated);
    setIsDirty(true);
  };

  if (isProjectLoading || isSchemaLoading) {
    return (
      <div className="p-6">
        <div className="flex w-full flex-col gap-5">
          <Skeleton className="bg-sidebar/50 h-8 w-48" />
          <Skeleton className="bg-sidebar/50 h-5 w-80" />
          <Skeleton className="bg-sidebar/50 h-96 w-full" />
        </div>
      </div>
    );
  }

  if (
    !projectResponse?.data ||
    projectResponse.error ||
    !schemaResponse?.data ||
    schemaResponse.error
  ) {
    return <ResourceHandler state="not_found" />;
  }

  const myRole = projectResponse.data.myRole;
  const canEdit = myRole === "owner" || myRole === "admin";

  return (
    <div>
      <div className="bg-muted sticky top-0 z-20 flex w-full items-center justify-between border-b px-4 py-3">
        <SchemaSelector />
        <div className="flex items-center gap-3">
          <Tabs
            value={viewTab}
            defaultValue={viewTab}
            onValueChange={(val) => setViewTab(val as ViewTab)}
          >
            <TabsList>
              <TabsTrigger value="builder">Builder</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
          </Tabs>

          {canEdit && (
            <Button
              size="sm"
              onClick={handleSave}
              isLoading={isSaving}
              disabled={!isDirty || !draft}
            >
              <HugeiconsIcon icon={FloppyDiskIcon} />
              {isDirty ? "Save Changes" : "Saved"}
            </Button>
          )}
        </div>
      </div>

      <div className="p-3">
        {viewTab === "preview" ? (
          <div className="bg-card rounded-2xl border p-6">
            <h3 className="mb-4 font-medium">Schema Structure Preview</h3>
            {draft ? (
              <SchemaPreviewTree structure={draft} />
            ) : (
              <p className="text-muted-foreground text-sm">
                No structure defined yet. Switch to the Builder tab to get
                started.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {canEdit && (
              <Tabs
                value={builderMode}
                defaultValue={builderMode}
                onValueChange={(val) => setBuilderMode(val as BuilderMode)}
              >
                <TabsList>
                  <TabsTrigger value="manual">Manual Builder</TabsTrigger>
                  <TabsTrigger value="json">Import from JSON</TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {builderMode === "json" ? (
              <JsonImportBuilder
                currentDraft={draft}
                onApply={handleDraftChange}
                readOnly={!canEdit}
              />
            ) : (
              <ManualBuilder
                currentDraft={draft}
                onChange={handleDraftChange}
                readOnly={!canEdit}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SchemaBuilderPage;
