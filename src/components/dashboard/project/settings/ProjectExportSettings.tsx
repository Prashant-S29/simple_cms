"use client";

import React, { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Download04Icon,
  CheckmarkCircle02Icon,
  AlertCircleIcon,
  Loading03Icon,
  ArrowDown01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { api } from "~/trpc/react";
import { generateTsType } from "~/lib/cms/tsTypeGenerator";
import type { SchemaStructure } from "~/zodSchema/cmsSchema";
import { cn } from "~/lib/utils";

interface ExportConfig {
  includeStructure: boolean;
  includeTypes: boolean;
}

type ExportStatus = "idle" | "running" | "done" | "error";

interface ProgressItem {
  label: string;
  status: "pending" | "running" | "done" | "skipped" | "error";
}

interface Props {
  projectId: string;
  projectSlug: string;
  orgId: string;
}

export const ProjectExportSettings: React.FC<Props> = ({
  projectId,
  projectSlug,
  orgId,
}) => {
  const [config, setConfig] = useState<ExportConfig>({
    includeStructure: true,
    includeTypes: true,
  });
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: schemasResponse } = api.cmsSchema.getAll.useQuery({
    projectId,
    orgId,
    page: 1,
    limit: 100,
  });

  const { data: langsResponse } = api.projectLanguage.getAll.useQuery({
    projectId,
    orgId,
  });

  const schemas = schemasResponse?.data?.items ?? [];
  const languages = (langsResponse?.data ?? []).filter(
    (l) => l.status === "active",
  );

  const utils = api.useUtils();

  const buildProgressPlan = (): ProgressItem[] => {
    const items: ProgressItem[] = [];

    for (const schema of schemas) {
      for (const lang of languages) {
        items.push({
          label: `schemas/${schema.slug}/${lang.locale}.json`,
          status: "pending",
        });
      }
    }

    if (config.includeStructure) {
      for (const schema of schemas) {
        items.push({
          label: `structure/${schema.slug}_structure.json`,
          status: "pending",
        });
      }
    }

    if (config.includeTypes) {
      for (const schema of schemas) {
        items.push({
          label: `types/${schema.slug}.types.ts`,
          status: "pending",
        });
      }
    }

    return items;
  };

  const handleExport = async () => {
    if (schemas.length === 0) return;

    setStatus("running");
    setErrorMsg(null);

    const plan = buildProgressPlan();
    setProgress(plan);

    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      let planIndex = 0;

      for (const schema of schemas) {
        const schemaFolder = zip.folder(`schemas/${schema.slug}`);
        if (!schemaFolder) continue;

        for (const lang of languages) {
          const idx = planIndex++;
          setProgress((prev) =>
            prev.map((item, i) =>
              i === idx ? { ...item, status: "running" } : item,
            ),
          );

          try {
            const result = await utils.cmsContent.getOrInit.fetch({
              schemaSlug: schema.slug,
              projectId,
              orgId,
              locale: lang.locale,
            });

            const content = result?.data?.content ?? {};
            schemaFolder.file(
              `${lang.locale}.json`,
              JSON.stringify(content, null, 2),
            );

            setProgress((prev) =>
              prev.map((item, i) =>
                i === idx ? { ...item, status: "done" } : item,
              ),
            );
          } catch {
            setProgress((prev) =>
              prev.map((item, i) =>
                i === idx ? { ...item, status: "error" } : item,
              ),
            );
          }
        }
      }

      if (config.includeStructure) {
        const structureFolder = zip.folder("structure");

        for (const schema of schemas) {
          const idx = planIndex++;
          setProgress((prev) =>
            prev.map((item, i) =>
              i === idx ? { ...item, status: "running" } : item,
            ),
          );

          try {
            const result = await utils.cmsSchema.getBySlug.fetch({
              slug: schema.slug,
              projectId,
              orgId,
            });

            const structure = result?.data?.schemaStructure ?? null;
            structureFolder?.file(
              `${schema.slug}_structure.json`,
              JSON.stringify(structure, null, 2),
            );

            setProgress((prev) =>
              prev.map((item, i) =>
                i === idx ? { ...item, status: "done" } : item,
              ),
            );
          } catch {
            setProgress((prev) =>
              prev.map((item, i) =>
                i === idx ? { ...item, status: "error" } : item,
              ),
            );
          }
        }
      }

      if (config.includeTypes) {
        const typesFolder = zip.folder("types");

        for (const schema of schemas) {
          const idx = planIndex++;
          setProgress((prev) =>
            prev.map((item, i) =>
              i === idx ? { ...item, status: "running" } : item,
            ),
          );

          try {
            const result = await utils.cmsSchema.getBySlug.fetch({
              slug: schema.slug,
              projectId,
              orgId,
            });

            const structure = result?.data?.schemaStructure as
              | SchemaStructure
              | null
              | undefined;

            if (structure) {
              const typeCode = generateTsType(structure, schema.slug);
              typesFolder?.file(`${schema.slug}.types.ts`, typeCode);
            }

            setProgress((prev) =>
              prev.map((item, i) =>
                i === idx ? { ...item, status: "done" } : item,
              ),
            );
          } catch {
            setProgress((prev) =>
              prev.map((item, i) =>
                i === idx ? { ...item, status: "error" } : item,
              ),
            );
          }
        }
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectSlug}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      setStatus("done");
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Export failed. Please try again.",
      );
      setStatus("error");
    }
  };

  const doneCount = progress.filter((p) => p.status === "done").length;
  const errorCount = progress.filter((p) => p.status === "error").length;
  const totalCount = progress.length;
  const progressPct =
    totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const canExport =
    status !== "running" && schemas.length > 0 && languages.length > 0;

  return (
    <div className="bg-card rounded-2xl border">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h3 className="font-medium">Export Project Data</h3>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Download all schema content as a structured zip file.
          </p>
        </div>

        <Button
          onClick={handleExport}
          disabled={!canExport}
          isLoading={status === "running"}
        >
          <HugeiconsIcon icon={Download04Icon} />
          {status === "running"
            ? `Exporting… ${progressPct}%`
            : status === "done"
              ? "Download Again"
              : "Export as ZIP"}
        </Button>
      </div>

      <div className="flex flex-col gap-5 p-5">
        {/* ── Config toggles ───────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <ToggleRow
            label="Include schema structure"
            description="Adds a /structure folder with each schema's field definitions"
            checked={config.includeStructure}
            onChange={(v) => setConfig((c) => ({ ...c, includeStructure: v }))}
            disabled={status === "running"}
          />
          <ToggleRow
            label="Include TypeScript types"
            description="Adds a /types folder with generated .types.ts files"
            checked={config.includeTypes}
            onChange={(v) => setConfig((c) => ({ ...c, includeTypes: v }))}
            disabled={status === "running"}
          />
        </div>

        {/* ── Zip preview ──────────────────────────────────────────────────── */}
        <ZipPreview
          projectSlug={projectSlug}
          schemas={schemas.map((s) => s.slug)}
          languages={languages.map((l) => l.locale)}
          config={config}
        />

        {/* ── Progress list ─────────────────────────────────────────────────── */}
        {progress.length > 0 && (
          <div className="flex flex-col gap-1">
            {/* Summary bar */}
            <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  status === "error" ? "bg-destructive" : "bg-primary",
                )}
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <p className="text-muted-foreground mt-1 text-xs">
              {status === "done"
                ? `✓ Export complete — ${doneCount} files`
                : status === "error"
                  ? errorMsg
                  : `${doneCount} / ${totalCount} files`}
              {errorCount > 0 && (
                <span className="text-destructive ml-2">
                  {errorCount} failed
                </span>
              )}
            </p>

            {/* File list */}
            <div className="bg-muted mt-2 max-h-52 overflow-y-auto rounded-xl p-3">
              <div className="flex flex-col gap-0.5">
                {progress.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <StatusIcon status={item.status} />
                    <span
                      className={cn(
                        "font-mono text-xs",
                        item.status === "error"
                          ? "text-destructive"
                          : item.status === "done"
                            ? "text-foreground"
                            : "text-muted-foreground",
                      )}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty state warnings */}
        {schemas.length === 0 && (
          <p className="text-muted-foreground text-sm">
            No schemas found in this project.
          </p>
        )}
        {languages.length === 0 && (
          <p className="text-muted-foreground text-sm">
            No active languages configured.
          </p>
        )}
      </div>
    </div>
  );
};

const ToggleRow: React.FC<{
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}> = ({ label, description, checked, onChange, disabled }) => (
  <div className="flex items-center justify-between gap-4">
    <div>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-muted-foreground text-xs">{description}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
  </div>
);

const ZipPreview: React.FC<{
  projectSlug: string;
  schemas: string[];
  languages: string[];
  config: ExportConfig;
}> = ({ projectSlug, schemas, languages, config }) => {
  const preview: string[] = [];
  const [previewExpanded, setPreviewExpanded] = useState(false);

  const previewSchemas = schemas.slice(0, 2);
  const moreSchemas = schemas.length - previewSchemas.length;

  preview.push(`📦 ${projectSlug}.zip`);
  preview.push(`  📁 schemas/`);

  for (const slug of previewSchemas) {
    preview.push(`    📁 ${slug}/`);
    for (const locale of languages) {
      preview.push(`      📄 ${locale}.json`);
    }
  }

  if (moreSchemas > 0) {
    preview.push(
      `    … +${moreSchemas} more schema${moreSchemas === 1 ? "" : "s"}`,
    );
  }

  if (config.includeStructure) {
    preview.push(`  📁 structure/`);
    for (const slug of previewSchemas) {
      preview.push(`    📄 ${slug}_structure.json`);
    }
    if (moreSchemas > 0) preview.push(`    …`);
  }

  if (config.includeTypes) {
    preview.push(`  📁 types/`);
    for (const slug of previewSchemas) {
      preview.push(`    📄 ${slug}.types.ts`);
    }
    if (moreSchemas > 0) preview.push(`    …`);
  }

  return (
    <div className="bg-muted rounded-xl">
      <div
        className="flex cursor-pointer items-center justify-between px-4 py-3"
        onClick={() => setPreviewExpanded((v) => !v)}
      >
        <p className="text-sm font-medium">ZIP Preview</p>
        <HugeiconsIcon
          icon={previewExpanded ? ArrowDown01Icon : ArrowRight01Icon}
          size={13}
          className="text-muted-foreground"
        />
      </div>
      {previewExpanded && (
        <div className="border-t px-4 pt-3 pb-4">
          <pre className="font-mono text-xs leading-relaxed">
            {preview.join("\n")}
          </pre>
        </div>
      )}
    </div>
  );
};

const StatusIcon: React.FC<{ status: ProgressItem["status"] }> = ({
  status,
}) => {
  switch (status) {
    case "done":
      return (
        <HugeiconsIcon
          icon={CheckmarkCircle02Icon}
          size={12}
          className="shrink-0 text-green-500"
        />
      );
    case "error":
      return (
        <HugeiconsIcon
          icon={AlertCircleIcon}
          size={12}
          className="text-destructive shrink-0"
        />
      );
    case "running":
      return (
        <HugeiconsIcon
          icon={Loading03Icon}
          size={12}
          className="text-primary shrink-0 animate-spin"
        />
      );
    default:
      return (
        <div className="bg-muted-foreground/30 size-3 shrink-0 rounded-full" />
      );
  }
};
