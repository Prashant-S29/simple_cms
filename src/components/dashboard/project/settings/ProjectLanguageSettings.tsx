"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlusSignIcon,
  Delete02Icon,
  LockIcon,
} from "@hugeicons/core-free-icons";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { Switch } from "~/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "~/components/ui/dialog";
import { AddLanguageDialog } from "./AddLanguageDialog";
import { SUPPORTED_LOCALES, getLocaleFlag } from "~/lib/locales";

interface Props {
  projectId: string;
  orgId: string;
}

export const ProjectLanguageSettings: React.FC<Props> = ({
  projectId,
  orgId,
}) => {
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);

  const utils = api.useUtils();

  const { data: response, isLoading } = api.projectLanguage.getAll.useQuery({
    projectId,
    orgId,
  });

  const { mutate: setStatus, isPending: isSettingStatus } =
    api.projectLanguage.setStatus.useMutation({
      onError: () => toast.error("Failed to update language status."),
      onSuccess: (res) => {
        if (res.error) {
          toast.error(res.error.message);
          return;
        }
        toast.success(res.message ?? "Language updated.");
        void utils.projectLanguage.getAll.invalidate();
      },
    });

  const { mutate: deleteLang, isPending: isDeleting } =
    api.projectLanguage.delete.useMutation({
      onError: () => toast.error("Failed to remove language."),
      onSuccess: (res) => {
        if (res.error) {
          toast.error(res.error.message);
          return;
        }
        toast.success(res.message ?? "Language removed.");
        setDeleteTarget(null);
        void utils.projectLanguage.getAll.invalidate();
      },
    });

  const languages = response?.data ?? [];
  const addedLocales = new Set(languages.map((l) => l.locale));
  const availableLocales = SUPPORTED_LOCALES.filter(
    (l) => !addedLocales.has(l.locale),
  );

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl border">
        <div className="border-b px-5 py-4">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex flex-col gap-2 p-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card rounded-2xl border">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="font-medium">Languages</h3>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Configure which languages are available for content editing.
              English is always required and cannot be removed.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            disabled={availableLocales.length === 0}
          >
            <HugeiconsIcon icon={PlusSignIcon} />
            Add Languages
          </Button>
        </div>

        {/* Language list */}
        <div className="flex flex-col divide-y">
          {languages.map((lang) => (
            <div
              key={lang.id}
              className="flex items-center justify-between px-5 py-3"
            >
              {/* Left */}
              <div className="flex items-center gap-3">
                <span className="text-xl leading-none">
                  {getLocaleFlag(lang.locale)}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{lang.label}</span>
                    {lang.isDefault && (
                      <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
                        Default
                      </span>
                    )}
                    <code className="text-muted-foreground font-mono text-xs">
                      {lang.locale}
                    </code>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {lang.status === "disabled" ? (
                      <span className="text-amber-500">
                        Disabled — hidden from managers
                      </span>
                    ) : (
                      "Active"
                    )}
                  </p>
                </div>
              </div>

              {/* Right */}
              <div className="flex items-center gap-3">
                {lang.isDefault ? (
                  <HugeiconsIcon
                    icon={LockIcon}
                    size={14}
                    className="text-muted-foreground"
                  />
                ) : (
                  <>
                    <Switch
                      checked={lang.status === "active"}
                      disabled={isSettingStatus}
                      onCheckedChange={(checked) =>
                        setStatus({
                          id: lang.id,
                          projectId,
                          orgId,
                          status: checked ? "active" : "disabled",
                        })
                      }
                    />
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="text-destructive hover:text-destructive/80"
                      onClick={() =>
                        setDeleteTarget({ id: lang.id, label: lang.label })
                      }
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={14} />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add languages dialog */}
      <AddLanguageDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        projectId={projectId}
        orgId={orgId}
        availableLocales={availableLocales}
      />

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove &quot;{deleteTarget?.label}&quot;</DialogTitle>
            <DialogDescription>
              This will remove the language from the project. Any content
              already saved in this language will be permanently deleted once
              content management is enabled.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              isLoading={isDeleting}
              onClick={() =>
                deleteTarget &&
                deleteLang({ id: deleteTarget.id, projectId, orgId })
              }
            >
              Remove Language
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
