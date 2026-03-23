"use client";

import React, { useState } from "react";
import { ResourceHandler } from "~/components/common";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Database02Icon,
  FileEditIcon,
  LanguageCircleIcon,
  Key01Icon,
  AlertCircleIcon,
  ArrowUpRight01Icon,
} from "@hugeicons/core-free-icons";
import { cn, formatDate } from "~/lib/utils";
import Image from "next/image";

interface Props {
  projectSlug: string;
  orgSlug: string;
  orgId: string;
}

const ProjectAdminPage: React.FC<Props> = ({ projectSlug, orgId }) => {
  const [analyticsDays, setAnalyticsDays] = useState<30 | 7 | 14>(30);

  const { data: response, isLoading } = api.project.getBySlug.useQuery({
    slug: projectSlug,
    orgId,
  });

  const projectId = response?.data?.id ?? "";

  const { data: statsResponse, isLoading: isStatsLoading } =
    api.projectDashboard.getStats.useQuery(
      { projectId, orgId },
      { enabled: !!projectId },
    );

  const { data: analyticsResponse, isLoading: isAnalyticsLoading } =
    api.projectDashboard.getAnalytics.useQuery(
      { projectId, orgId, days: analyticsDays },
      { enabled: !!projectId },
    );

  const { data: activityResponse, isLoading: isActivityLoading } =
    api.projectDashboard.getActivityFeed.useQuery(
      { projectId, orgId, limit: 20 },
      { enabled: !!projectId },
    );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex flex-col gap-5">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-full max-w-xl" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!response?.data || response.error) {
    return <ResourceHandler state="not_found" />;
  }

  const stats = statsResponse?.data;
  const analytics = analyticsResponse?.data;
  const activity = activityResponse?.data ?? [];

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-muted sticky top-0 z-20 w-full border-b px-4 py-3">
        <h1 className="capitalize">Admin Dashboard</h1>
      </div>

      <div className="flex flex-col gap-6 p-4">
        {/* ── Stat cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="Schemas"
            value={stats?.schemas.total ?? 0}
            icon={<HugeiconsIcon icon={Database02Icon} size={18} />}
            isLoading={isStatsLoading}
            warning={
              stats?.schemas.withoutStructure
                ? `${stats.schemas.withoutStructure} without structure`
                : undefined
            }
          />
          <StatCard
            label="Blog Posts"
            value={stats?.blogs.total ?? 0}
            icon={<HugeiconsIcon icon={FileEditIcon} size={18} />}
            isLoading={isStatsLoading}
            sub={
              stats?.blogs.published
                ? `${stats.blogs.published} published`
                : "None published"
            }
          />
          <StatCard
            label="Languages"
            value={stats?.languages.active ?? 0}
            icon={<HugeiconsIcon icon={LanguageCircleIcon} size={18} />}
            isLoading={isStatsLoading}
          />
          <StatCard
            label="Active API Keys"
            value={stats?.apiKeys.active ?? 0}
            icon={<HugeiconsIcon icon={Key01Icon} size={18} />}
            isLoading={isStatsLoading}
            warning={stats?.apiKeys.active === 0 ? "No active keys" : undefined}
          />
        </div>

        {/* ── Analytics ───────────────────────────────────────────────────── */}
        <div className="bg-card rounded-2xl border">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h3 className="font-medium">API Requests</h3>
              <p className="text-muted-foreground mt-0.5 text-sm">
                Inbound requests to your content API
              </p>
            </div>
            {/* Period selector */}
            <div className="bg-muted flex items-center rounded-lg p-1">
              {([7, 14, 30] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setAnalyticsDays(d)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                    analyticsDays === d
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {isAnalyticsLoading ? (
            <div className="p-5">
              <Skeleton className="h-32 w-full" />
            </div>
          ) : !analytics || analytics.summary.total === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <HugeiconsIcon
                icon={ArrowUpRight01Icon}
                size={28}
                className="text-muted-foreground"
              />
              <p className="text-muted-foreground text-sm">
                No API requests in the last {analyticsDays} days.
              </p>
            </div>
          ) : (
            <div className="p-5">
              {/* Summary row */}
              <div className="mb-6 grid grid-cols-4 gap-4">
                <MiniStat
                  label="Total Requests"
                  value={analytics.summary.total.toLocaleString()}
                />
                <MiniStat
                  label="Successful"
                  value={analytics.summary.success.toLocaleString()}
                  color="text-green-600"
                />
                <MiniStat
                  label="Errors"
                  value={analytics.summary.errors.toLocaleString()}
                  color={
                    analytics.summary.errors > 0
                      ? "text-destructive"
                      : undefined
                  }
                />
                <MiniStat
                  label="Avg Response"
                  value={`${analytics.summary.avgDurationMs}ms`}
                />
              </div>

              {/* Sparkline chart */}
              {analytics.perDay.length > 0 && (
                <div className="mb-6">
                  <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
                    Requests per day
                  </p>
                  <Sparkline data={analytics.perDay} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Top endpoints */}
                <div>
                  <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
                    Top Endpoints
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {analytics.topEndpoints.map((e) => (
                      <div
                        key={e.endpoint}
                        className="flex items-center justify-between"
                      >
                        <code className="text-xs">{e.endpoint}</code>
                        <span className="text-muted-foreground text-xs tabular-nums">
                          {e.total.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top errors */}
                <div>
                  <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
                    Top Errors
                  </p>
                  {analytics.topErrors.length === 0 ? (
                    <p className="text-muted-foreground text-xs">
                      No errors 🎉
                    </p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {analytics.topErrors.map((e) => (
                        <div
                          key={e.errorCode}
                          className="flex items-center justify-between"
                        >
                          <code className="text-destructive text-xs">
                            {e.errorCode}
                          </code>
                          <span className="text-muted-foreground text-xs tabular-nums">
                            {e.total.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Activity feed ────────────────────────────────────────────────── */}
        <div className="bg-card rounded-2xl border">
          <div className="border-b px-5 py-4">
            <h3 className="font-medium">Activity</h3>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Recent changes made to this project
            </p>
          </div>

          {isActivityLoading ? (
            <div className="flex flex-col gap-3 p-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-8 shrink-0 rounded-full" />
                  <div className="flex flex-1 flex-col gap-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-muted-foreground text-sm">
                No activity yet. Changes made to schemas, content, and blog
                posts will appear here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col divide-y">
              {activity.map((entry) => (
                <ActivityEntry key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectAdminPage;

// ─── Stat card ────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  isLoading: boolean;
  sub?: string;
  warning?: string;
}> = ({ label, value, icon, isLoading, sub, warning }) => (
  <div className="bg-card rounded-2xl border p-5">
    <div className="mb-3 flex items-center justify-between">
      <span className="text-muted-foreground text-sm">{label}</span>
      <div className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-lg">
        {icon}
      </div>
    </div>
    {isLoading ? (
      <Skeleton className="h-8 w-16" />
    ) : (
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    )}
    {warning && (
      <p className="mt-1 flex items-center gap-1 text-xs text-amber-500">
        <HugeiconsIcon icon={AlertCircleIcon} size={11} />
        {warning}
      </p>
    )}
    {sub && !warning && (
      <p className="text-muted-foreground mt-1 text-xs">{sub}</p>
    )}
  </div>
);

// ─── Mini stat ────────────────────────────────────────────────────────────────

const MiniStat: React.FC<{
  label: string;
  value: string;
  color?: string;
}> = ({ label, value, color }) => (
  <div className="bg-muted rounded-xl p-3">
    <p className="text-muted-foreground text-xs">{label}</p>
    <p className={cn("mt-1 text-lg font-semibold tabular-nums", color)}>
      {value}
    </p>
  </div>
);

// ─── Sparkline ────────────────────────────────────────────────────────────────

const Sparkline: React.FC<{
  data: { date: string; total: number; errors: number }[];
}> = ({ data }) => {
  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="flex h-16 items-end gap-1">
      {data.map((d) => {
        const heightPct = Math.max((d.total / max) * 100, 4);
        const errorPct = d.total > 0 ? (d.errors / d.total) * 100 : 0;
        return (
          <div
            key={d.date}
            className="group relative flex flex-1 flex-col justify-end"
            style={{ height: "100%" }}
            title={`${d.date}: ${d.total} requests, ${d.errors} errors`}
          >
            <div
              className={cn(
                "w-full rounded-sm transition-opacity group-hover:opacity-80",
                errorPct > 20 ? "bg-destructive/60" : "bg-primary/60",
              )}
              style={{ height: `${heightPct}%` }}
            />
          </div>
        );
      })}
    </div>
  );
};

// ─── Activity entry ───────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  "schema.created": "created schema",
  "schema.updated": "renamed schema",
  "schema.deleted": "deleted schema",
  "schema.structure_saved": "saved structure for",
  "schema.structure_reset": "reset structure for",
  "content.saved": "saved content for",
  "content.reset": "reset content for",
  "blog.created": "created blog post",
  "blog.deleted": "deleted blog post",
  "blog.saved": "saved blog post",
  "blog.published": "published blog post",
  "blog.unpublished": "unpublished blog post",
  "blog.toggled_active": "toggled visibility of",
  "language.added": "added language",
  "language.enabled": "enabled language",
  "language.disabled": "disabled language",
  "language.deleted": "removed language",
  "api_key.created": "created API key",
  "api_key.revoked": "revoked API key",
  "member.invited": "invited member",
  "member.removed": "removed member",
  "member.role_updated": "updated role of",
};

const ActivityEntry: React.FC<{
  entry: {
    id: string;
    action: string;
    resourceSlug: string | null;
    metadata: unknown;
    createdAt: Date;
    userName: string;
    userEmail: string;
    userImage: string | null;
  };
}> = ({ entry }) => {
  const meta = entry.metadata as Record<string, string> | null;
  const label = ACTION_LABELS[entry.action] ?? entry.action;

  // Resource display — prefer resourceSlug, fall back to metadata
  const resource =
    entry.resourceSlug ?? meta?.locale ?? meta?.name ?? meta?.title ?? null;

  // Extra context (e.g. locale)
  const locale = meta?.locale as string | undefined;

  return (
    <div className="flex items-center gap-3 px-5 py-3">
      {/* Avatar */}
      <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium uppercase">
        {entry.userImage ? (
          <Image
            width={50}
            height={50}
            src={entry.userImage}
            alt={entry.userName}
            className="size-8 rounded-full object-cover"
          />
        ) : (
          entry.userName.charAt(0)
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-medium">{entry.userName}</span>{" "}
          <span className="text-muted-foreground">{label}</span>{" "}
          {resource && (
            <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
              {resource}
            </code>
          )}
          {locale && (
            <span className="text-muted-foreground ml-1 text-xs">
              ({locale})
            </span>
          )}
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {formatDate(entry.createdAt)}
        </p>
      </div>
    </div>
  );
};
