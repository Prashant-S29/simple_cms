"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  Upload04Icon,
  TickDouble01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "~/components/ui/button";
import { ResourceHandler } from "~/components/common";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";
import {
  BulkSchemaUploader,
  BulkSchemaReview,
} from "~/components/dashboard/schema/bulk";
import type { ParsedSchemaFile } from "~/components/dashboard/schema/bulk";

interface Props {
  projectSlug: string;
  orgSlug: string;
  orgId: string;
}

type Step = "upload" | "review" | "done";

const BulkSchemaPage: React.FC<Props> = ({ projectSlug, orgSlug, orgId }) => {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [parsedFiles, setParsedFiles] = useState<ParsedSchemaFile[]>([]);
  const [results, setResults] = useState<{
    created: number;
    failed: { title: string; reason: string }[];
  } | null>(null);

  const { data: projectResponse, isLoading: isProjectLoading } =
    api.project.getBySlug.useQuery({ slug: projectSlug, orgId });

  if (isProjectLoading) {
    return (
      <div className="p-6">
        <div className="flex w-full flex-col gap-5">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-80" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!projectResponse?.data || projectResponse.error) {
    return <ResourceHandler state="not_found" />;
  }

  const project = projectResponse.data;
  const myRole = project.myRole;

  if (myRole !== "owner" && myRole !== "admin") {
    return <ResourceHandler state="not_found" />;
  }

  const projectId = project.id;

  const handleFilesParsed = (files: ParsedSchemaFile[]) => {
    setParsedFiles(files);
    setStep("review");
  };

  const handleDone = (result: {
    created: number;
    failed: { title: string; reason: string }[];
  }) => {
    setResults(result);
    setStep("done");
    if (result.failed.length === 0) {
      toast.success("All schemas created successfully.");
    } else {
      toast.warning(
        `${result.created} created, ${result.failed.length} failed.`,
      );
    }
  };

  const handleBackToSchemas = () => {
    router.push(
      `/dashboard/org/${orgSlug}/project/${projectSlug}/admin/schema?orgId=${orgId}`,
    );
  };

  const handleStartOver = () => {
    setParsedFiles([]);
    setResults(null);
    setStep("upload");
  };

  return (
    <div>
      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="bg-muted sticky top-0 z-20 flex w-full items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleBackToSchemas}
            aria-label="Back to schemas"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} />
          </Button>
          <div>
            <h1 className="font-medium">Bulk Schema Creation</h1>
            <p className="text-muted-foreground text-sm">
              {step === "upload" && "Select your locale JSON files to import"}
              {step === "review" &&
                `Review ${parsedFiles.length} parsed schema${parsedFiles.length === 1 ? "" : "s"} before creating`}
              {step === "done" && "Import complete"}
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {(["upload", "review", "done"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : i < ["upload", "review", "done"].indexOf(step)
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {i < ["upload", "review", "done"].indexOf(step) ? "✓" : i + 1}
              </div>
              <span
                className={`text-sm capitalize ${step === s ? "text-foreground font-medium" : "text-muted-foreground"}`}
              >
                {s}
              </span>
              {i < 2 && <div className="bg-border mx-1 h-px w-6" />}
            </div>
          ))}
        </div>
      </div>

      <div className="p-3">
        {step === "upload" && (
          <BulkSchemaUploader onFilesParsed={handleFilesParsed} />
        )}

        {step === "review" && (
          <BulkSchemaReview
            files={parsedFiles}
            projectId={projectId}
            orgId={orgId}
            onDone={handleDone}
            onBack={() => setStep("upload")}
          />
        )}

        {step === "done" && results && (
          <div className="flex flex-col items-center gap-6 py-12 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-green-500/10">
              <HugeiconsIcon
                icon={TickDouble01Icon}
                size={32}
                className="text-green-500"
              />
            </div>

            <div>
              <h2 className="text-xl font-semibold">Import Complete</h2>
              <p className="text-muted-foreground mt-1">
                {results.created} schema{results.created === 1 ? "" : "s"}{" "}
                created successfully
                {results.failed.length > 0 &&
                  `, ${results.failed.length} failed`}
                .
              </p>
            </div>

            {results.failed.length > 0 && (
              <div className="bg-destructive/5 border-destructive/20 w-full max-w-lg rounded-xl border p-4 text-left">
                <h4 className="text-destructive mb-2 text-sm font-medium">
                  Failed schemas
                </h4>
                <div className="flex flex-col gap-2">
                  {results.failed.map((f, i) => (
                    <div key={i} className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{f.title}</span>
                      <span className="text-muted-foreground text-xs">
                        {f.reason}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleStartOver}>
                <HugeiconsIcon icon={Upload04Icon} />
                Import More
              </Button>
              <Button onClick={handleBackToSchemas}>View All Schemas</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkSchemaPage;
