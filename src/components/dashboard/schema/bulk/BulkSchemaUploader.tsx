"use client";

import React, { useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Upload04Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  AlertCircleIcon,
  File01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "~/components/ui/button";
import { jsonToSchemaStructure } from "~/lib/cms/jsonParser";
import type { SchemaStructure } from "~/zodSchema/cmsSchema";
import { cn } from "~/lib/utils";

export interface ParsedSchemaFile {
  /** Original filename without extension — used as default schema title */
  fileName: string;
  /** Raw JSON string as read from the file */
  rawJson: string;
  /** Parsed schema structure — null if parsing failed */
  structure: SchemaStructure | null;
  /** Parse error message if structure is null */
  parseError: string | null;
}

interface Props {
  onFilesParsed: (files: ParsedSchemaFile[]) => void;
}

type FileStatus = "idle" | "parsing" | "done";

export const BulkSchemaUploader: React.FC<Props> = ({ onFilesParsed }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<FileStatus>("idle");
  const [parsed, setParsed] = useState<ParsedSchemaFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const parseFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.name.endsWith(".json"));

    if (fileArray.length === 0) {
      return;
    }

    setStatus("parsing");

    const results: ParsedSchemaFile[] = await Promise.all(
      fileArray.map(async (file) => {
        const fileName = file.name.replace(/\.json$/, "");
        let rawJson = "";
        let structure: SchemaStructure | null = null;
        let parseError: string | null = null;

        try {
          rawJson = await file.text();
          const json = JSON.parse(rawJson) as unknown;
          structure = jsonToSchemaStructure(json);
        } catch (err) {
          parseError =
            err instanceof Error ? err.message : "Failed to parse file.";
        }

        return { fileName, rawJson, structure, parseError };
      }),
    );

    setParsed(results);
    setStatus("done");
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) void parseFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) void parseFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleRemove = (index: number) => {
    setParsed((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) setStatus("idle");
      return next;
    });
  };

  const handleReset = () => {
    setParsed([]);
    setStatus("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  const successCount = parsed.filter((f) => f.structure !== null).length;
  const errorCount = parsed.filter((f) => f.structure === null).length;
  const canProceed = successCount > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Instructions ──────────────────────────────────────────────────── */}
      <div className="bg-card rounded-xl border p-5">
        <h3 className="font-medium">Select JSON Files</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Select one or more JSON locale files (e.g.{" "}
          <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">
            aboutPage.json
          </code>
          ,{" "}
          <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">
            home.json
          </code>
          ). The filename becomes the schema title. Each file will be parsed
          into a schema structure which you can review and edit before creating.
        </p>
      </div>

      {/* ── Drop zone ─────────────────────────────────────────────────────── */}
      {status === "idle" && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "bg-card flex cursor-pointer flex-col items-center gap-4 rounded-xl border-2 border-dashed p-12 text-center transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/30",
          )}
        >
          <div className="bg-muted flex size-14 items-center justify-center rounded-xl">
            <HugeiconsIcon
              icon={Upload04Icon}
              size={28}
              className="text-muted-foreground"
            />
          </div>
          <div>
            <p className="font-medium">
              Drop JSON files here or click to browse
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              Select multiple files at once — only{" "}
              <code className="font-mono">.json</code> files are accepted
            </p>
          </div>
          <Button variant="outline" size="sm" type="button">
            Browse Files
          </Button>

          <input
            ref={inputRef}
            type="file"
            accept=".json"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
        </div>
      )}

      {/* ── Parsing indicator ─────────────────────────────────────────────── */}
      {status === "parsing" && (
        <div className="bg-card flex items-center justify-center rounded-xl border p-12">
          <p className="text-muted-foreground text-sm">Parsing files...</p>
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {status === "done" && parsed.length > 0 && (
        <div className="bg-card rounded-xl border">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="flex items-center gap-3">
              <h3 className="font-medium">
                {parsed.length} file{parsed.length === 1 ? "" : "s"} loaded
              </h3>
              {successCount > 0 && (
                <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600">
                  {successCount} ready
                </span>
              )}
              {errorCount > 0 && (
                <span className="bg-destructive/10 text-destructive rounded-full px-2.5 py-0.5 text-xs font-medium">
                  {errorCount} failed
                </span>
              )}
            </div>
            <section className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <HugeiconsIcon icon={Cancel01Icon} />
                Reset
              </Button>
              {status === "done" && (
                <div className="flex justify-end">
                  <Button
                    disabled={!canProceed}
                    onClick={() =>
                      onFilesParsed(parsed.filter((f) => f.structure !== null))
                    }
                  >
                    Review {successCount} Schema
                    {successCount === 1 ? "" : "s"}
                    <HugeiconsIcon icon={ArrowRight01Icon} />
                  </Button>
                </div>
              )}
            </section>
          </div>

          {/* File list */}
          <div className="flex flex-col divide-y">
            {parsed.map((file, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                {/* Status icon */}
                {file.structure !== null ? (
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    size={18}
                    className="shrink-0 text-green-500"
                  />
                ) : (
                  <HugeiconsIcon
                    icon={AlertCircleIcon}
                    size={18}
                    className="text-destructive shrink-0"
                  />
                )}

                <HugeiconsIcon
                  icon={File01Icon}
                  size={16}
                  className="text-muted-foreground shrink-0"
                />

                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">
                    {file.fileName}.json
                  </span>
                  {file.parseError && (
                    <span className="text-destructive truncate text-xs">
                      {file.parseError}
                    </span>
                  )}
                  {file.structure && (
                    <span className="text-muted-foreground text-xs">
                      {Object.keys(file.structure.fields).length} top-level
                      field
                      {Object.keys(file.structure.fields).length === 1
                        ? ""
                        : "s"}{" "}
                      detected
                    </span>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleRemove(i)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  aria-label="Remove file"
                >
                  <HugeiconsIcon icon={Cancel01Icon} />
                </Button>
              </div>
            ))}
          </div>

          {/* Add more files */}
          <div className="border-t px-5 py-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              + Add more files
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".json"
              multiple
              className="hidden"
              onChange={async (e) => {
                if (!e.target.files) return;
                const newFiles = Array.from(e.target.files).filter((f) =>
                  f.name.endsWith(".json"),
                );
                const newResults = await Promise.all(
                  newFiles.map(async (file) => {
                    const fileName = file.name.replace(/\.json$/, "");
                    let rawJson = "",
                      structure: SchemaStructure | null = null,
                      parseError: string | null = null;
                    try {
                      rawJson = await file.text();
                      structure = jsonToSchemaStructure(
                        JSON.parse(rawJson) as unknown,
                      );
                    } catch (err) {
                      parseError =
                        err instanceof Error
                          ? err.message
                          : "Failed to parse file.";
                    }
                    return { fileName, rawJson, structure, parseError };
                  }),
                );
                setParsed((prev) => [...prev, ...newResults]);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
