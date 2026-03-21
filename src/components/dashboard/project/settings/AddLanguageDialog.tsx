"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "~/components/ui/dialog";
import { SUPPORTED_LOCALES } from "~/lib/locales";
import { cn } from "~/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  orgId: string;
  availableLocales: readonly { locale: string; label: string; flag: string }[];
}

export const AddLanguageDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  projectId,
  orgId,
  availableLocales,
}) => {
  const utils = api.useUtils();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (locale: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(locale)) {
        next.delete(locale);
      } else {
        next.add(locale);
      }
      return next;
    });
  };

  const handleClose = (v: boolean) => {
    if (!v) setSelected(new Set());
    onOpenChange(v);
  };

  const { mutate: bulkAdd, isPending } =
    api.projectLanguage.bulkAdd.useMutation({
      onError: () => toast.error("Failed to add languages."),
      onSuccess: (res) => {
        if (res.error) {
          toast.error(res.error.message);
          return;
        }
        toast.success(res.message ?? "Languages added.");
        setSelected(new Set());
        onOpenChange(false);
        void utils.projectLanguage.getAll.invalidate();
      },
    });

  const handleConfirm = () => {
    if (selected.size === 0) return;
    const locales = SUPPORTED_LOCALES.filter((l) => selected.has(l.locale)).map(
      (l) => ({ locale: l.locale, label: l.label }),
    );
    bulkAdd({ projectId, orgId, locales });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Languages</DialogTitle>
          <DialogDescription>
            Select one or more languages to enable for content editing.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto py-2 pr-1">
          {availableLocales.map((locale) => {
            const isSelected = selected.has(locale.locale);
            return (
              <button
                key={locale.locale}
                type="button"
                onClick={() => toggle(locale.locale)}
                className={cn(
                  "relative flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted",
                )}
              >
                <span className="text-base">{locale.flag}</span>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">
                    {locale.label}
                  </span>
                  <span className="text-muted-foreground font-mono text-xs">
                    {locale.locale}
                  </span>
                </div>
                {isSelected && (
                  <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    size={14}
                    className="text-primary absolute top-2 right-2 shrink-0"
                  />
                )}
              </button>
            );
          })}

          {availableLocales.length === 0 && (
            <p className="text-muted-foreground col-span-2 py-4 text-center text-sm">
              All supported languages have been added.
            </p>
          )}
        </div>

        {/* Selection count */}
        {selected.size > 0 && (
          <p className="text-muted-foreground text-xs">
            {selected.size} language{selected.size === 1 ? "" : "s"} selected
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => handleClose(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selected.size === 0 || isPending}
            isLoading={isPending}
          >
            Add {selected.size > 0 ? `${selected.size} ` : ""}Language
            {selected.size !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
