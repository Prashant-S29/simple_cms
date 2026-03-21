"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
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
  const [jsonExpanded, setJsonExpanded] = useState(true);

  const tryParse = (value: string) => {
    if (!value.trim()) {
      setParseState("idle");
      setParseError(null);
      setParsed(null);
      setJsonExpanded(true);
      return;
    }

    let json: unknown;
    try {
      json = JSON.parse(value);
    } catch {
      const trimmed = value.trim();
      if (trimmed.endsWith("}") || trimmed.endsWith("]")) {
        setParseState("error");
        setParseError("Invalid JSON — check for syntax errors.");
      } else {
        setParseState("idle");
        setParseError(null);
      }
      setParsed(null);
      setJsonExpanded(true);
      return;
    }

    try {
      const structure = jsonToSchemaStructure(json);
      setParsed(structure);
      setParseState("parsed");
      setParseError(null);
      setJsonExpanded(false);
    } catch (err) {
      setParseState("error");
      setParseError(err instanceof Error ? err.message : "Failed to parse.");
      setParsed(null);
      setJsonExpanded(true);
    }
  };

  const handleChange = (value: string) => {
    setRaw(value);
    tryParse(value);
  };

  const handleApply = () => {
    if (!parsed) return;
    onApply(parsed);
    toast.success("Schema imported from JSON. Review and save.");
    setRaw("");
    setParsed(null);
    setParseState("idle");
    setParseError(null);
    setJsonExpanded(true);
  };

  const handleReset = () => {
    setRaw("");
    setParsed(null);
    setParseError(null);
    setParseState("idle");
    setJsonExpanded(true);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* ── Description ───────────────────────────────────────────────────── */}
      <div className="bg-card rounded-xl border p-4">
        <p className="text-muted-foreground text-sm">
          Paste your existing locale JSON (e.g.{" "}
          <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">
            aboutPage.json
          </code>
          ) — the schema is inferred automatically as you type. You can review
          and correct field types before applying.
        </p>
      </div>

      {/* ── Collapsible JSON input ─────────────────────────────────────────── */}
      <div className="bg-card rounded-xl border">
        {/* Header — always visible, click to expand/collapse */}
        <div
          className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left"
          onClick={() => setJsonExpanded((v) => !v)}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">JSON Input</span>
            {parseState === "parsed" && (
              <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
                Parsed
              </span>
            )}
            {parseState === "error" && (
              <span className="bg-destructive/10 text-destructive rounded-full px-2 py-0.5 text-xs font-medium">
                Error
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {raw && (
              <Button
                size="icon-xs"
                variant="ghost"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={14} />
              </Button>
            )}
            <HugeiconsIcon
              icon={jsonExpanded ? ArrowDown01Icon : ArrowRight01Icon}
              size={14}
              className="text-muted-foreground"
            />
          </div>
        </div>

        {/* Collapsible textarea */}
        {jsonExpanded && (
          <div className="border-t px-4 pt-3 pb-4">
            <Textarea
              value={raw}
              onChange={(e) => handleChange(e.target.value)}
              placeholder={`{\n  "hero": {\n    "title": "Hello World",\n    "description": "..."\n  }\n}`}
              rows={14}
              disabled={readOnly}
              className="font-mono text-xs"
              aria-invalid={parseState === "error"}
              autoFocus
            />
            {parseState === "error" && parseError && (
              <p className="text-destructive mt-2 text-sm">{parseError}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Parsed preview ─────────────────────────────────────────────────── */}
      {parseState === "parsed" && parsed && (
        <div className="bg-card rounded-xl border p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h4 className="font-medium">Parsed Structure</h4>
              <p className="text-muted-foreground mt-0.5 text-sm">
                Review the inferred field types. Switch to Manual mode after
                applying to fine-tune individual fields.
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

      {/* ── Existing draft warning ──────────────────────────────────────────── */}
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
