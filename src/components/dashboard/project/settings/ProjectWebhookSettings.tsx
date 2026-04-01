"use client";

import React, { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

interface Props {
  projectId: string;
  orgId: string;
  webhookUrl: string;
  webhookSecret: string;
}

export const ProjectWebhookSettings: React.FC<Props> = ({
  projectId,
  orgId,
  webhookUrl,
  webhookSecret,
}) => {
  const [webhookUrlInput, setWebhookUrlInput] = useState(webhookUrl);
  const [webhookSecretInput, setWebhookSecretInput] = useState(webhookSecret);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mutation = api.project.updateWebhook.useMutation({
    onSuccess: () => {
      setSaved(true);
      setErrorMsg(null);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err) => {
      setErrorMsg(err.message ?? "Failed to save webhook settings.");
      setSaved(false);
    },
  });

  const handleSave = () => {
    setErrorMsg(null);
    setSaved(false);
    mutation.mutate({
      id: projectId,
      orgId,
      webhookUrl: webhookUrl.trim() || null,
      webhookSecret: webhookSecret.trim() || null,
    });
  };

  return (
    <div className="bg-card rounded-2xl border">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h3 className="font-medium">Webhook</h3>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Send a revalidation signal to your site whenever content is updated.
          </p>
        </div>
        <HugeiconsIcon
          icon={Link01Icon}
          size={18}
          className="text-muted-foreground"
        />
      </div>

      {/* Body */}
      <div className="flex flex-col gap-5 p-5">
        {/* Endpoint URL */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="webhook-url">Endpoint URL</Label>
          <Input
            id="webhook-url"
            type="url"
            placeholder="https://yoursite.com/api/revalidate"
            value={webhookUrlInput}
            onChange={(e) => setWebhookUrlInput(e.target.value)}
          />
          <p className="text-muted-foreground text-xs">
            The route on your Next.js site that calls{" "}
            <code className="bg-muted rounded px-1 py-0.5 font-mono">
              revalidateTag()
            </code>
            .
          </p>
        </div>

        {/* Secret */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="webhook-secret">Secret</Label>
          <Input
            id="webhook-secret"
            type="password"
            placeholder="Paste your REVALIDATE_SECRET here"
            value={webhookSecretInput}
            onChange={(e) => setWebhookSecretInput(e.target.value)}
          />
          <p className="text-muted-foreground text-xs">
            Must match the{" "}
            <code className="bg-muted rounded px-1 py-0.5 font-mono">
              REVALIDATE_SECRET
            </code>{" "}
            environment variable on your site. The CMS forwards it as a{" "}
            <code className="bg-muted rounded px-1 py-0.5 font-mono">
              ?secret=
            </code>{" "}
            query param.
          </p>
        </div>

        {/* Footer row — save button + feedback */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            isLoading={mutation.isPending}
            disabled={mutation.isPending}
          >
            Save Webhook
          </Button>

          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={15} />
              Saved
            </span>
          )}

          {errorMsg && (
            <span className="text-destructive text-sm">{errorMsg}</span>
          )}
        </div>

        {/* Info callout */}
        <div className="bg-muted rounded-xl px-4 py-3">
          <p className="text-muted-foreground text-xs leading-relaxed">
            <span className="text-foreground font-medium">How it works: </span>
            After every content save, blog publish/unpublish, or schema change
            the CMS fires a background POST to your endpoint. Your route calls{" "}
            <code className="bg-background rounded px-1 py-0.5 font-mono">
              revalidateTag(schema)
            </code>{" "}
            so only the affected section of your site is re-fetched — not the
            entire page.
          </p>
        </div>
      </div>
    </div>
  );
};
