"use client";

import React, { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Copy01Icon,
  CheckmarkCircle02Icon,
  AlertCircleIcon,
  ArrowDown01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import {
  generateContentTemplate,
  validateContentAgainstSchema,
  type ValidationResult,
} from "~/lib/cms/contentTemplate";
import { TypesPanel } from "./TypesPanel";
import type { SchemaStructure } from "~/zodSchema/cmsSchema";

interface Props {
  structure: SchemaStructure;
  schemaSlug: string;
  data: Record<string, unknown>;
  onChange: (updated: Record<string, unknown>) => void;
}

export const JsonContentPanel: React.FC<Props> = ({
  structure,
  schemaSlug,
  data,
  onChange,
}) => {
  const template = generateContentTemplate(structure);
  const templateStr = JSON.stringify(template, null, 2);

  const [raw, setRaw] = useState(() => JSON.stringify(data, null, 2));
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [templateExpanded, setTemplateExpanded] = useState(false);
  const [jsonExpanded, setJsonExpanded] = useState(true);

  const [copied, setCopied] = useState(false);

  const lastJsonRef = useRef<string>(JSON.stringify(data, null, 2));

  useEffect(() => {
    const incoming = JSON.stringify(data, null, 2);
    if (incoming !== lastJsonRef.current) {
      setRaw(incoming);
      lastJsonRef.current = incoming;
      setValidation({ ok: true });
    }
  }, [data]);

  const handleRawChange = (value: string) => {
    setRaw(value);

    if (!value.trim()) {
      setValidation(null);
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      const trimmed = value.trim();
      if (trimmed.endsWith("}") || trimmed.endsWith("]")) {
        setValidation({
          ok: false,
          errors: ["Invalid JSON — check for syntax errors."],
        });
      } else {
        setValidation(null);
      }
      return;
    }

    const result = validateContentAgainstSchema(parsed, structure);
    setValidation(result);

    if (result.ok) {
      lastJsonRef.current = value;
      onChange(parsed as Record<string, unknown>);
    }
  };

  const handleCopyTemplate = async () => {
    await navigator.clipboard.writeText(templateStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isValid = validation?.ok === true;
  const hasErrors = validation?.ok === false;
  const errors = hasErrors
    ? (validation as { ok: false; errors: string[] }).errors
    : [];

  return (
    <div className="flex flex-col gap-3">
      {/* ── JSON textarea ─────────────────────────────────────────────────── */}
      <div className="bg-card rounded-xl border">
        <div
          className="flex cursor-pointer items-center justify-between px-4 py-2.5"
          onClick={() => setJsonExpanded((v) => !v)}
        >
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              icon={jsonExpanded ? ArrowDown01Icon : ArrowRight01Icon}
              size={13}
              className="text-muted-foreground"
            />
            <span className="text-sm font-medium">JSON Editor</span>
          </div>
          {validation && (
            <div className="flex items-center gap-1.5">
              {isValid ? (
                <>
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    size={13}
                    className="text-green-500"
                  />
                  <span className="text-xs text-green-600">In sync</span>
                </>
              ) : (
                <>
                  <HugeiconsIcon
                    icon={AlertCircleIcon}
                    size={13}
                    className="text-destructive"
                  />
                  <span className="text-destructive text-xs">
                    {errors.length} error{errors.length === 1 ? "" : "s"}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {jsonExpanded && (
          <>
            <div className="border-t p-3">
              <Textarea
                value={raw}
                onChange={(e) => handleRawChange(e.target.value)}
                rows={20}
                className="font-mono text-xs"
                aria-invalid={hasErrors}
                spellCheck={false}
              />
            </div>

            {hasErrors && errors.length > 0 && (
              <div className="border-t px-4 pb-4">
                <ul className="flex flex-col gap-1 pt-3">
                  {errors.slice(0, 5).map((err, i) => (
                    <li key={i} className="text-destructive font-mono text-xs">
                      {err}
                    </li>
                  ))}
                  {errors.length > 5 && (
                    <li className="text-destructive text-xs">
                      +{errors.length - 5} more errors
                    </li>
                  )}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
      {/* ── Collapsible expected structure ────────────────────────────────── */}
      <div className="bg-card rounded-xl border">
        <div
          className="flex cursor-pointer items-center justify-between px-4 py-2.5"
          onClick={() => setTemplateExpanded((v) => !v)}
        >
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              icon={templateExpanded ? ArrowDown01Icon : ArrowRight01Icon}
              size={13}
              className="text-muted-foreground"
            />
            <span className="text-sm font-medium">Expected Structure</span>
          </div>
          {templateExpanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                void handleCopyTemplate();
              }}
              className="text-muted-foreground h-6 gap-1 px-2 text-xs"
            >
              <HugeiconsIcon
                icon={copied ? CheckmarkCircle02Icon : Copy01Icon}
                size={12}
                className={copied ? "text-green-500" : ""}
              />
              {copied ? "Copied" : "Copy"}
            </Button>
          )}
        </div>

        {templateExpanded && (
          <div className="border-t px-4 pt-3 pb-4">
            <pre className="font-mono text-xs leading-relaxed wrap-break-word whitespace-pre-wrap">
              {templateStr}
            </pre>
            <div className="text-muted-foreground mt-3 flex flex-col gap-0.5 text-xs">
              <span>
                <code className="bg-muted rounded px-1">{'"'}</code> — text or
                file URL
              </span>
              <span>
                <code className="bg-muted rounded px-1">{'[""]'}</code> — text
                array
              </span>
              <span>
                <code className="bg-muted rounded px-1">{"[{...}]"}</code> —
                object array
              </span>
            </div>
          </div>
        )}
      </div>

      <TypesPanel structure={structure} schemaSlug={schemaSlug} />
    </div>
  );
};
