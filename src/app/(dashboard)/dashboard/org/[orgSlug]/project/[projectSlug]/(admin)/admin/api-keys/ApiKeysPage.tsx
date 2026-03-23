"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PlusSignIcon,
  Copy01Icon,
  CheckmarkCircle02Icon,
  Delete02Icon,
  AlertCircleIcon,
  Key01Icon,
} from "@hugeicons/core-free-icons";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Field, FieldLabel, FieldError } from "~/components/ui/field";
import { Skeleton } from "~/components/ui/skeleton";
import { ResourceHandler } from "~/components/common";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "~/components/ui/dialog";
import { formatDate } from "~/lib/utils";
import { cn } from "~/lib/utils";

interface Props {
  projectSlug: string;
  orgSlug: string;
  orgId: string;
}

const ApiKeysPage: React.FC<Props> = ({ projectSlug, orgId }) => {
  const [createOpen, setCreateOpen] = useState(false);
  const [revealedKey, setRevealedKey] = useState<{
    name: string;
    rawKey: string;
  } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<{
    id: string;
    name: string;
    keyPrefix: string;
  } | null>(null);

  const { data: projectResponse, isLoading: isProjectLoading } =
    api.project.getBySlug.useQuery({ slug: projectSlug, orgId });

  const projectId = projectResponse?.data?.id ?? "";

  const { data: keysResponse, isLoading: isKeysLoading } =
    api.projectApiKey.getAll.useQuery(
      { projectId, orgId },
      { enabled: !!projectId },
    );

  const utils = api.useUtils();

  const { mutate: revokeKey, isPending: isRevoking } =
    api.projectApiKey.revoke.useMutation({
      onError: () => toast.error("Failed to revoke key."),
      onSuccess: (res) => {
        if (res.error) {
          toast.error(res.error.message);
          return;
        }
        toast.success(res.message ?? "Key revoked.");
        setRevokeTarget(null);
        void utils.projectApiKey.getAll.invalidate();
      },
    });

  if (isProjectLoading) {
    return (
      <div className="p-6">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!projectResponse?.data || projectResponse.error) {
    return <ResourceHandler state="not_found" />;
  }

  const keys = keysResponse?.data ?? [];
  const activeKeys = keys.filter((k) => k.status === "active");
  const revokedKeys = keys.filter((k) => k.status === "revoked");

  return (
    <>
      <div>
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b px-4 py-3">
          <div>
            <h1 className="font-medium">API Keys</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Keys authenticate external requests to the content API.
            </p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <HugeiconsIcon icon={PlusSignIcon} />
            New Key
          </Button>
        </div>

        <div className="flex flex-col gap-6 p-4">
          {/* ── Usage note ────────────────────────────────────────────────── */}
          <div className="bg-muted rounded-xl p-4">
            <p className="text-sm font-medium">How to use</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Pass your API key in the{" "}
              <code className="bg-background rounded px-1.5 py-0.5 font-mono text-xs">
                x-api-key
              </code>{" "}
              header on every request.
            </p>
            <div className="bg-background mt-3 rounded-lg p-3">
              <pre className="font-mono text-xs leading-relaxed">
                {`GET /api/v1/content?schema=home&locale=en
x-api-key: scms_your_key_here

GET /api/v1/blogs?locale=en
x-api-key: scms_your_key_here

GET /api/v1/blogs/my-post-slug?locale=en
x-api-key: scms_your_key_here`}
              </pre>
            </div>
          </div>

          {/* ── Active keys ───────────────────────────────────────────────── */}
          <div className="bg-card rounded-2xl border">
            <div className="border-b px-5 py-4">
              <h3 className="font-medium">
                Active Keys
                {activeKeys.length > 0 && (
                  <span className="text-muted-foreground ml-2 text-sm font-normal">
                    ({activeKeys.length})
                  </span>
                )}
              </h3>
            </div>

            {isKeysLoading ? (
              <div className="flex flex-col gap-2 p-4">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : activeKeys.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <HugeiconsIcon
                  icon={Key01Icon}
                  size={28}
                  className="text-muted-foreground"
                />
                <p className="text-muted-foreground text-sm">
                  No active keys. Create one to start using the API.
                </p>
              </div>
            ) : (
              <div className="flex flex-col divide-y">
                {activeKeys.map((key) => (
                  <KeyRow
                    key={key.id}
                    apiKey={key}
                    onRevoke={() =>
                      setRevokeTarget({
                        id: key.id,
                        name: key.name,
                        keyPrefix: key.keyPrefix,
                      })
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Revoked keys ──────────────────────────────────────────────── */}
          {revokedKeys.length > 0 && (
            <div className="bg-card rounded-2xl border">
              <div className="border-b px-5 py-4">
                <h3 className="text-muted-foreground font-medium">
                  Revoked Keys
                  <span className="ml-2 text-sm font-normal">
                    ({revokedKeys.length})
                  </span>
                </h3>
              </div>
              <div className="flex flex-col divide-y">
                {revokedKeys.map((key) => (
                  <KeyRow key={key.id} apiKey={key} revoked />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Create key dialog ──────────────────────────────────────────────── */}
      <CreateKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        orgId={orgId}
        onCreated={(name, rawKey) => {
          setCreateOpen(false);
          setRevealedKey({ name, rawKey });
          void utils.projectApiKey.getAll.invalidate();
        }}
      />

      {/* ── One-time key reveal dialog ─────────────────────────────────────── */}
      <KeyRevealDialog
        open={!!revealedKey}
        keyName={revealedKey?.name ?? ""}
        rawKey={revealedKey?.rawKey ?? ""}
        onClose={() => setRevealedKey(null)}
      />

      {/* ── Revoke confirmation dialog ─────────────────────────────────────── */}
      <Dialog
        open={!!revokeTarget}
        onOpenChange={(v) => !v && setRevokeTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Revoke &quot;{revokeTarget?.name}&quot;</DialogTitle>
            <DialogDescription>
              This key will immediately stop working. Any services using it will
              get 401 errors. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <code className="bg-muted text-muted-foreground rounded px-2 py-1 font-mono text-xs">
              {revokeTarget?.keyPrefix}...
            </code>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setRevokeTarget(null)}
              disabled={isRevoking}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              isLoading={isRevoking}
              onClick={() =>
                revokeTarget &&
                revokeKey({
                  id: revokeTarget.id,
                  projectId,
                  orgId,
                })
              }
            >
              Revoke Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ApiKeysPage;

// ─── Key row ──────────────────────────────────────────────────────────────────

const KeyRow: React.FC<{
  apiKey: {
    id: string;
    name: string;
    keyPrefix: string;
    status: "active" | "revoked";
    lastUsedAt: Date | null;
    createdAt: Date;
    revokedAt: Date | null;
  };
  onRevoke?: () => void;
  revoked?: boolean;
}> = ({ apiKey, onRevoke, revoked = false }) => (
  <div
    className={cn(
      "flex items-center justify-between px-5 py-4",
      revoked && "opacity-60",
    )}
  >
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          revoked ? "bg-muted" : "bg-primary/10",
        )}
      >
        <HugeiconsIcon
          icon={Key01Icon}
          size={14}
          className={revoked ? "text-muted-foreground" : "text-primary"}
        />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{apiKey.name}</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              revoked
                ? "bg-muted text-muted-foreground"
                : "bg-green-500/10 text-green-600",
            )}
          >
            {revoked ? "Revoked" : "Active"}
          </span>
        </div>
        <div className="text-muted-foreground mt-0.5 flex items-center gap-3 text-xs">
          <code className="font-mono">{apiKey.keyPrefix}...</code>
          <span>Created {formatDate(apiKey.createdAt)}</span>
          {apiKey.lastUsedAt && (
            <span>Last used {formatDate(apiKey.lastUsedAt)}</span>
          )}
          {revoked && apiKey.revokedAt && (
            <span>Revoked {formatDate(apiKey.revokedAt)}</span>
          )}
          {!revoked && !apiKey.lastUsedAt && (
            <span className="text-amber-500">Never used</span>
          )}
        </div>
      </div>
    </div>

    {!revoked && onRevoke && (
      <Button
        size="sm"
        variant="outline"
        className="text-destructive hover:text-destructive/80 shrink-0"
        onClick={onRevoke}
      >
        <HugeiconsIcon icon={Delete02Icon} size={13} />
        Revoke
      </Button>
    )}
  </div>
);

// ─── Create key dialog ────────────────────────────────────────────────────────

const CreateKeyDialog: React.FC<{
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  orgId: string;
  onCreated: (name: string, rawKey: string) => void;
}> = ({ open, onOpenChange, projectId, orgId, onCreated }) => {
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName("");
      setNameError(null);
    }
  }, [open]);

  const { mutate: createKey, isPending } = api.projectApiKey.create.useMutation(
    {
      onError: () => toast.error("Failed to create key."),
      onSuccess: (res) => {
        if (res.error) {
          toast.error(res.error.message);
          return;
        }
        onCreated(res.data.name, res.data.rawKey);
      },
    },
  );

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Name is required");
      return;
    }
    if (trimmed.length > 100) {
      setNameError("Max 100 characters");
      return;
    }
    createKey({ projectId, orgId, name: trimmed });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create API Key</DialogTitle>
          <DialogDescription>
            Give this key a descriptive name so you can identify it later.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Field data-invalid={!!nameError}>
            <FieldLabel htmlFor="key-name">Key Name</FieldLabel>
            <Input
              id="key-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirm();
              }}
              placeholder="e.g. Production, Staging, Netlify"
              autoFocus
            />
            {nameError && <FieldError errors={[{ message: nameError }]} />}
          </Field>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!name.trim() || isPending}
            isLoading={isPending}
          >
            Create Key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Key reveal dialog ────────────────────────────────────────────────────────

const KeyRevealDialog: React.FC<{
  open: boolean;
  keyName: string;
  rawKey: string;
  onClose: () => void;
}> = ({ open, keyName, rawKey, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setConfirmed(false);
    }
  }, [open]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && confirmed) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-green-500/10">
                <HugeiconsIcon
                  icon={Key01Icon}
                  size={16}
                  className="text-green-500"
                />
              </div>
              Key Created — &quot;{keyName}&quot;
            </div>
          </DialogTitle>
          <DialogDescription>
            Copy your API key now. For security reasons it{" "}
            <strong className="text-foreground">will not be shown again</strong>
            .
          </DialogDescription>
        </DialogHeader>

        {/* Warning banner */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
          <HugeiconsIcon
            icon={AlertCircleIcon}
            size={16}
            className="mt-0.5 shrink-0 text-amber-500"
          />
          <p className="text-sm text-amber-600">
            Store this key securely — in an environment variable, not in your
            source code. If you lose it, you will need to create a new key.
          </p>
        </div>

        {/* Key display */}
        <div className="bg-muted flex items-center gap-2 rounded-xl p-3">
          <code className="min-w-0 flex-1 font-mono text-xs break-all">
            {rawKey}
          </code>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="shrink-0"
          >
            <HugeiconsIcon
              icon={copied ? CheckmarkCircle02Icon : Copy01Icon}
              size={13}
              className={copied ? "text-green-500" : ""}
            />
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>

        {/* Confirmation checkbox */}
        <div
          className="flex cursor-pointer items-center gap-3"
          onClick={() => setConfirmed((v) => !v)}
        >
          <div
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
              confirmed
                ? "border-primary bg-primary"
                : "border-muted-foreground",
            )}
          >
            {confirmed && (
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                size={12}
                className="text-primary-foreground"
              />
            )}
          </div>
          <span className="text-sm">
            I have copied and securely stored this key.
          </span>
        </div>

        <DialogFooter>
          <Button onClick={onClose} disabled={!confirmed} className="w-full">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
