"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ResourceHandler } from "~/components/common";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Folder01Icon,
  FileEditIcon,
  Alert02Icon,
  Key01Icon,
} from "@hugeicons/core-free-icons";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "~/components/ui/chart";
import { AreaChart, Area, XAxis, CartesianGrid } from "recharts";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn, formatDate } from "~/lib/utils";
import { getLocaleFlag } from "~/lib/locales";

interface Props {
  projectSlug: string;
  orgSlug: string;
  orgId: string;
}

const ENDPOINT_LABELS: Record<string, string> = {
  content: "Content",
  "blogs.list": "Blog List",
  "blogs.detail": "Blog Detail",
};

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

export const ProjectAdminPage: React.FC<Props> = ({
  projectSlug,
  orgSlug,
  orgId,
}) => {
  const [analyticsDays, setAnalyticsDays] = useState<7 | 14 | 30>(30);

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

  const { data: langsResponse } = api.projectLanguage.getAll.useQuery(
    { projectId, orgId },
    { enabled: !!projectId },
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-3">
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-64 w-full rounded-2xl" />
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
  const activeLanguages = (langsResponse?.data ?? []).filter(
    (l) => l.status === "active",
  );

  const adminBase = `/dashboard/org/${orgSlug}/project/${projectSlug}/admin`;
  const qs = `?orgId=${orgId}`;

  const hasEnoughData = (analytics?.perDay?.length ?? 0) >= 3;
  return (
    <div className="flex h-full w-full flex-col gap-3 overflow-hidden p-3">
      {/* ── Top row: 4 cards ─────────────────────────────────────────────── */}
      <div className="grid w-full grid-cols-4 gap-3">
        {/* Recent Schemas */}
        <div className="flex flex-col rounded-xl border">
          <section className="flex items-center justify-between px-4 pt-3">
            <p className="text-sm font-medium">
              Recent Schemas
              {stats?.schemas.total ? (
                <span className="text-muted-foreground ml-1 font-normal">
                  ({stats.schemas.total})
                </span>
              ) : null}
            </p>

            {stats?.schemas.recent.length === 0 ? (
              <Button
                variant="outline"
                size="xs"
                nativeButton={false}
                render={<Link href={`${adminBase}/schema${qs}`} />}
              >
                Create Schema
              </Button>
            ) : (
              <Button
                variant="outline"
                size="xs"
                nativeButton={false}
                render={<Link href={`${adminBase}/schema${qs}`} />}
              >
                View All
              </Button>
            )}
          </section>
          <div className="mt-3 grid h-full grid-cols-2 grid-rows-2 gap-2 p-3 pt-0">
            {isStatsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 rounded-lg" />
              ))
            ) : stats?.schemas.recent.length === 0 ? (
              <div className="bg-input/20 col-span-2 row-span-2 flex flex-col items-center justify-center gap-2 rounded-lg border py-6 text-sm">
                <p className="text-muted-foreground text-xs">No schemas yet</p>
              </div>
            ) : (
              stats?.schemas.recent.map((schema) => (
                <div key={schema.id} className="h-full">
                  <Link
                    href={`${adminBase}/schema/${schema.slug}${qs}`}
                    className="bg-secondary hover:bg-sidebar/20 flex h-full items-center justify-between rounded-sm border px-3 py-2 transition-colors"
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <HugeiconsIcon
                        icon={Folder01Icon}
                        size={14}
                        className="text-muted-foreground shrink-0"
                      />
                      <span className="truncate text-sm capitalize">
                        {schema.title}
                      </span>
                    </div>
                    {!schema.hasStructure && (
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="flex cursor-default items-center p-1">
                            <HugeiconsIcon
                              icon={Alert02Icon}
                              size={13}
                              className="text-amber-500"
                            />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs">No structure defined yet</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Blogs */}
        <div className="flex flex-col rounded-xl border">
          <section className="flex items-center justify-between px-4 pt-3">
            <p className="text-sm font-medium">
              Recent Blogs
              {stats?.blogs.total ? (
                <span className="text-muted-foreground ml-1 font-normal">
                  ({stats.blogs.total})
                </span>
              ) : null}
            </p>

            {stats?.blogs.recent.length === 0 ? (
              <Button
                variant="outline"
                size="xs"
                nativeButton={false}
                render={<Link href={`${adminBase}/blog${qs}`} />}
              >
                Create Post
              </Button>
            ) : (
              <Button
                variant="outline"
                size="xs"
                nativeButton={false}
                render={<Link href={`${adminBase}/blog${qs}`} />}
              >
                View All
              </Button>
            )}
          </section>
          <div className="mt-3 grid h-full grid-cols-2 grid-rows-2 gap-2 p-3 pt-0">
            {isStatsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 rounded-lg" />
              ))
            ) : stats?.blogs.recent.length === 0 ? (
              <div className="bg-input/20 col-span-2 row-span-2 flex flex-col items-center justify-center gap-2 rounded-lg border py-6 text-sm">
                <p className="text-muted-foreground text-xs">
                  No blog posts yet
                </p>
              </div>
            ) : (
              stats?.blogs.recent.map((post) => (
                <div key={post.id} className="h-full">
                  <Link
                    href={`${adminBase}/blog${qs}`}
                    className="bg-secondary hover:bg-sidebar/20 flex h-full items-center gap-1.5 rounded-sm border px-3 py-2 transition-colors"
                  >
                    <HugeiconsIcon
                      icon={FileEditIcon}
                      size={14}
                      className="text-muted-foreground shrink-0"
                    />
                    <span className="truncate text-sm">{post.slug}</span>
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Languages */}
        <div className="flex flex-col rounded-xl border">
          <section className="flex items-center justify-between px-4 pt-3">
            <p className="text-sm font-medium">Languages</p>

            <Button
              variant="outline"
              size="xs"
              nativeButton={false}
              render={<Link href={`${adminBase}/settings${qs}`} />}
            >
              Manage
            </Button>
          </section>
          <div className="mt-3 grid h-full grid-cols-3 grid-rows-2 gap-2 p-3 pt-0">
            {isStatsLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 rounded-lg" />
              ))
            ) : activeLanguages.length === 0 ? (
              <div className="bg-input/20 col-span-3 row-span-2 flex h-full flex-col items-center justify-center gap-2 rounded-lg border py-6">
                <p className="text-muted-foreground text-xs">
                  No languages configured
                </p>
              </div>
            ) : (
              <>
                {(activeLanguages.length > 6
                  ? activeLanguages.slice(0, 5)
                  : activeLanguages
                ).map((lang) => (
                  <div
                    key={lang.id}
                    className="bg-secondary flex items-center gap-1.5 rounded-sm border px-2 py-2"
                  >
                    <span className="text-sm">
                      {getLocaleFlag(lang.locale)}
                    </span>
                    <span className="truncate text-xs font-medium">
                      {lang.label}
                    </span>
                  </div>
                ))}
                {activeLanguages.length > 6 && (
                  <Link
                    href={`${adminBase}/settings${qs}`}
                    className="bg-secondary hover:bg-muted flex items-center justify-center rounded-sm border px-2 py-2 transition-colors"
                  >
                    <span className="text-muted-foreground text-xs">
                      +{activeLanguages.length - 5} more
                    </span>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>

        {/* Team */}
        <div className="flex flex-col rounded-xl border">
          <section className="flex items-center justify-between px-4 pt-3">
            <p className="text-sm font-medium">Team</p>

            <Button
              variant="outline"
              size="xs"
              nativeButton={false}
              render={<Link href={`/dashboard/org/${orgSlug}/settings${qs}`} />}
            >
              Manage
            </Button>
          </section>
          <div className="mt-3 flex flex-col gap-2 p-3 pt-0">
            {isStatsLoading ? (
              <>
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-10 rounded-lg" />
              </>
            ) : (
              <>
                <div className="bg-secondary flex items-center gap-3 rounded-lg border px-3 py-2.5">
                  <AvatarStack
                    count={Math.min(stats?.team.admins ?? 0, 5)}
                    users={stats?.team.adminList}
                  />
                  <p className="text-xs font-medium">
                    {stats?.team.admins ?? 0} Admin
                    {(stats?.team.admins ?? 0) !== 1 ? "s" : ""}
                  </p>
                </div>

                {stats?.team.managers === 0 ? (
                  <div className="bg-secondary flex items-center gap-3 rounded-lg border px-3 py-2.5">
                    <p className="text-xs font-medium">No managers</p>
                  </div>
                ) : (
                  <div className="bg-secondary flex items-center gap-3 rounded-lg border px-3 py-2.5">
                    <AvatarStack
                      count={Math.min(stats?.team.managers ?? 0, 5)}
                      users={stats?.team.managerList}
                    />{" "}
                    <p className="text-xs font-medium">
                      {stats?.team.managers ?? 0} Manager
                      {(stats?.team.managers ?? 0) !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom row: API keys + chart | Activity ──────────────────────── */}
      <div className="grid min-h-0 w-full flex-1 grid-cols-2 gap-3">
        {/* Left col: API keys + chart */}
        <div className="flex flex-col gap-3">
          {/* API Keys */}
          <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border">
            <section className="flex items-center justify-between px-4 pt-3">
              <p className="text-sm font-medium">
                API Keys
                {stats?.apiKeys.active ? (
                  <span className="text-muted-foreground ml-1 font-normal">
                    ({stats.apiKeys.active} active)
                  </span>
                ) : null}
              </p>
              <Link
                href={`${adminBase}/api-keys${qs}`}
                className="text-muted-foreground text-xs underline-offset-4 hover:underline"
              >
                Manage
              </Link>
            </section>
            <div className="p-3">
              {isStatsLoading ? (
                <Skeleton className="h-16 rounded-xl" />
              ) : stats?.apiKeys.list.length === 0 ? (
                <div className="bg-input/20 flex h-30 items-center justify-center rounded-xl border">
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`${adminBase}/api-keys${qs}`} />}
                  >
                    <HugeiconsIcon icon={Key01Icon} size={13} />
                    Create API Key
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {stats?.apiKeys.list.map((key) => (
                    <div
                      key={key.id}
                      className="bg-secondary flex items-center justify-between rounded-lg border px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <HugeiconsIcon
                          icon={Key01Icon}
                          size={12}
                          className="text-primary"
                        />
                        <span className="text-xs font-medium">{key.name}</span>
                        <code className="text-muted-foreground font-mono text-xs">
                          {key.keyPrefix}...
                        </code>
                      </div>
                      <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-600">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* API Requests Chart */}
          <div className="flex flex-1 flex-col rounded-2xl border">
            <section className="flex items-center justify-between px-4 pt-3">
              <p className="text-sm font-medium">
                API Requests
                <span className="text-muted-foreground ml-1 text-xs font-normal">
                  (Inbound API Calls)
                </span>
              </p>
              <div className="bg-muted flex items-center rounded-lg p-0.5">
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
            </section>

            <div className="flex-1 p-3">
              {isAnalyticsLoading ? (
                <Skeleton className="h-40 w-full rounded-xl" />
              ) : !analytics || analytics.summary.total === 0 ? (
                <div className="bg-input/20 flex h-full flex-col items-center justify-center gap-1 rounded-xl border">
                  <p className="text-sm">No data available</p>
                  <p className="text-muted-foreground text-xs">
                    Make API requests to see analytics
                  </p>
                </div>
              ) : !hasEnoughData ? (
                <div className="bg-input/20 flex h-full flex-col items-center justify-center gap-1 rounded-xl border">
                  <p className="text-sm">Not enough data</p>
                  <p className="text-muted-foreground text-xs">
                    At least 3 days of API activity required
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Summary mini stats */}
                  <div className="grid grid-cols-4 gap-2">
                    <MiniStat
                      label="Total"
                      value={analytics.summary.total.toLocaleString()}
                    />
                    <MiniStat
                      label="Success"
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
                      label="Avg"
                      value={`${analytics.summary.avgDurationMs}ms`}
                    />
                  </div>

                  {/* Chart */}
                  <ApiAreaChart data={analytics.perDay} />

                  {/* Top endpoints */}
                  {analytics.topEndpoints.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                        Top Endpoints
                      </p>
                      {analytics.topEndpoints.map((e) => (
                        <div
                          key={e.endpoint}
                          className="flex items-center justify-between"
                        >
                          <code className="text-xs">
                            {ENDPOINT_LABELS[e.endpoint] ?? e.endpoint}
                          </code>
                          <span className="text-muted-foreground text-xs tabular-nums">
                            {e.total.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right col: Activity feed */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border">
          <section className="flex items-center justify-between border-b px-4 pt-3 pb-3">
            <p className="text-sm font-medium">Recent Activity</p>
          </section>

          {isActivityLoading ? (
            <div className="flex flex-col gap-3 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-7 shrink-0 rounded-full" />
                  <div className="flex flex-1 flex-col gap-1">
                    <Skeleton className="h-3.5 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
              <p className="text-muted-foreground text-sm">No activity yet</p>
              <p className="text-muted-foreground text-xs">
                Changes to schemas, content, and blog posts will appear here.
              </p>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col divide-y overflow-y-auto">
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

// ─── Avatar stack ─────────────────────────────────────────────────────────────

const AvatarStack: React.FC<{
  count: number;
  users?: { id: string; name: string; image: string | null }[];
}> = ({ count, users = [] }) => (
  <div className="flex items-center">
    {users.length > 0
      ? users.map((u, i) => (
          <div
            key={u.id}
            className="border-background bg-muted size-5 overflow-hidden rounded-full"
            style={{ marginLeft: i === 0 ? 0 : -6 }}
          >
            {u.image ? (
              <Image
                src={u.image}
                alt={u.name}
                width={40}
                height={40}
                className="size-5 rounded-full object-cover"
              />
            ) : (
              <div className="bg-muted flex size-5 items-center justify-center rounded-full text-[9px] font-medium uppercase">
                {u.name?.charAt(0)}
              </div>
            )}
          </div>
        ))
      : Array.from({ length: Math.max(count, 1) }).map((_, i) => (
          <div
            key={i}
            className="bg-muted border-background size-5 rounded-full border-2"
            style={{ marginLeft: i === 0 ? 0 : -6 }}
          />
        ))}
  </div>
);

// ─── Mini stat ────────────────────────────────────────────────────────────────

const MiniStat: React.FC<{ label: string; value: string; color?: string }> = ({
  label,
  value,
  color,
}) => (
  <div className="bg-muted rounded-lg p-2">
    <p className="text-muted-foreground text-xs">{label}</p>
    <p className={cn("mt-0.5 text-sm font-semibold tabular-nums", color)}>
      {value}
    </p>
  </div>
);

// ─── API Area Chart ───────────────────────────────────────────────────────────

const chartConfig = {
  success: {
    label: "Success",
    color: "#22c55e",
  },
  errors: {
    label: "Errors",
    color: "#ef4444",
  },
} satisfies ChartConfig;

const ApiAreaChart: React.FC<{
  data: { date: string; total: number; success: number; errors: number }[];
}> = ({ data }) => (
  <ChartContainer config={chartConfig} className="h-80 w-full">
    <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
      <defs>
        <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
          <stop
            offset="95%"
            stopColor="hsl(var(--chart-2))"
            stopOpacity={0.05}
          />
        </linearGradient>

        <linearGradient id="fillSuccess" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
          <stop offset="95%" stopColor="#262626" stopOpacity={0.05} />
        </linearGradient>

        <linearGradient id="fillErrors" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
          <stop offset="95%" stopColor="##262626" stopOpacity={0.05} />
        </linearGradient>
      </defs>
      <CartesianGrid vertical={false} stroke="hsl(var(--chart-2))" />
      <XAxis
        dataKey="date"
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        tick={{ fontSize: 10, fill: "hsl(var(--chart-2))" }}
        tickFormatter={(v: string) => {
          const d = new Date(v);
          return `${d.getMonth() + 1}/${d.getDate()}`;
        }}
      />
      <ChartTooltip
        cursor={{ stroke: "hsl(var(--chart-2))", strokeWidth: 1 }}
        content={
          <ChartTooltipContent
            labelFormatter={(label) => {
              const d = new Date(String(label));
              return d.toLocaleDateString();
            }}
          />
        }
      />

      <Area dataKey="success" stroke="#22c55e" fill="url(#fillSuccess)" />

      <Area dataKey="errors" stroke="#ef4444" fill="url(#fillErrors)" />
      <ChartLegend content={<ChartLegendContent />} />
    </AreaChart>
  </ChartContainer>
);

// ─── Activity entry ───────────────────────────────────────────────────────────

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
  const resource =
    entry.resourceSlug ?? meta?.locale ?? meta?.name ?? meta?.title ?? null;
  const locale = meta?.locale as string | undefined;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <div className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium uppercase">
        {entry.userImage ? (
          <Image
            width={28}
            height={28}
            src={entry.userImage}
            alt={entry.userName}
            className="size-7 rounded-full object-cover"
          />
        ) : (
          entry.userName.charAt(0)
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs">
          <span className="font-medium">{entry.userName}</span>{" "}
          <span className="text-muted-foreground">{label}</span>{" "}
          {resource && (
            <code className="bg-muted rounded px-1 py-0.5 text-xs">
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
