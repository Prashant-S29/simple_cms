"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Cancel01Icon,
  TickDouble01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { SchemaPreviewTree } from "./SchemaPreviewTree";
import { jsonToSchemaStructure } from "~/lib/cms/jsonParser";
import type { SchemaStructure } from "~/zodSchema/cmsSchema";

interface Props {
  currentDraft: SchemaStructure | null;
  onApply: (structure: SchemaStructure) => void;
  readOnly: boolean;
}

type ParseState = "idle" | "parsed" | "error";

export const JsonImportBuilder: React.FC<Props> = ({
  currentDraft,
  onApply,
  readOnly,
}) => {
  const [raw, setRaw] = useState("");
  const [parseState, setParseState] = useState<ParseState>("idle");
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<SchemaStructure | null>(null);

  const handleParse = () => {
    setParseError(null);
    setParsed(null);
    setParseState("idle");

    if (!raw.trim()) {
      setParseError("Paste your JSON first.");
      setParseState("error");
      return;
    }

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      setParseError("Invalid JSON — check for syntax errors.");
      setParseState("error");
      return;
    }

    try {
      const structure = jsonToSchemaStructure(json);
      setParsed(structure);
      setParseState("parsed");
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Failed to parse.");
      setParseState("error");
    }
  };

  const handleApply = () => {
    if (!parsed) return;
    onApply(parsed);
    toast.success("Schema imported from JSON. Review and save.");
    // Reset so the textarea is clear for next import
    setRaw("");
    setParsed(null);
    setParseState("idle");
  };

  const handleReset = () => {
    setRaw("");
    setParsed(null);
    setParseError(null);
    setParseState("idle");
  };

  return (
    <div className="flex flex-col">
      <div className="bg-card rounded-t-xl p-5 border-b">
        {/*<h3 className="font-medium">Import from JSON</h3>*/}
        <p className="text-muted-foreground mt-1 text-sm">
          Paste your existing locale JSON (e.g.{" "}
          <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">
            aboutPage.json
          </code>
          ) and we will infer the schema structure automatically. You can review
          and correct field types before applying.
        </p>
      </div>

      <div className="bg-card rounded-b-xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-medium">Paste JSON</h4>
          <div className="flex items-center gap-2">
            {parseState !== "idle" && (
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <HugeiconsIcon icon={Cancel01Icon} />
                Reset
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleParse}
              disabled={readOnly || !raw.trim()}
            >
              <HugeiconsIcon icon={ArrowRight01Icon} />
              Parse
            </Button>
          </div>
        </div>

        <Textarea
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value);
            // Clear error as user types
            if (parseState === "error") {
              setParseState("idle");
              setParseError(null);
            }
          }}
          placeholder={`{\n  "hero": {\n    "title": "Hello World",\n    "description": "..."\n  }\n}`}
          rows={14}
          disabled={readOnly}
          className="font-mono text-xs"
          aria-invalid={parseState === "error"}
        />

        {parseState === "error" && parseError && (
          <p className="text-destructive mt-2 text-sm">{parseError}</p>
        )}
      </div>

      {/* ── Parsed preview ────────────────────────────────────────────── */}
      {parseState === "parsed" && parsed && (
        <div className="bg-card rounded-2xl border p-5 mt-3">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h4 className="font-medium">Parsed Structure</h4>
              <p className="text-muted-foreground mt-0.5 text-sm">
                Review the inferred field types. You can switch to Manual mode
                after applying to fine-tune individual fields.
              </p>
            </div>
            <Button size="sm" onClick={handleApply}>
              <HugeiconsIcon icon={TickDouble01Icon} />
              Apply to Builder
            </Button>
          </div>

          <SchemaPreviewTree structure={parsed} />
        </div>
      )}

      {/* ── Current draft notice ──────────────────────────────────────── */}
      {currentDraft && parseState === "idle" && (
        <div className="bg-muted rounded-xl px-4 py-3">
          <p className="text-muted-foreground text-sm">
            A schema structure is already defined. Importing and applying new
            JSON will <strong className="text-foreground">replace</strong> the
            existing structure. Switch to Manual mode to edit fields
            individually.
          </p>
        </div>
      )}
    </div>
  );
};
