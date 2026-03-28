"use client";
import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import React from "react";
import { Button } from "~/components/ui/button";
import { PROJECT_ADMIN_DASHBOARD_NAVLINKS } from "~/lib/constants";

export const ProjectAdminPageSideMenu: React.FC = () => {
  const { orgSlug, projectSlug } = useParams<{
    orgSlug: string;
    projectSlug: string;
  }>();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const orgId = searchParams.get("orgId") ?? "";

  const buildNavHref = (segment: string) => {
    const base = `/dashboard/org/${orgSlug}/project/${projectSlug}/admin${segment ? `/${segment}` : ""}`;
    const params = new URLSearchParams({ orgId });
    return `${base}?${params.toString()}`;
  };

  const isActive = (segment: string) => {
    const base = `/dashboard/org/${orgSlug}/project/${projectSlug}/admin${
      segment ? `/${segment}` : ""
    }`;
    if (!segment) return pathname === base;
    return pathname.startsWith(base);
  };

  return (
    <div className="flex max-w-50 min-w-50 flex-col gap-2">
      <div className="flex flex-col px-3 pt-18">
        <Button
          variant={isActive("") ? "secondary" : "ghost"}
          nativeButton={false}
          className="justify-start rounded-lg"
          render={
            isActive("") ? (
              <span>Dashboard</span>
            ) : (
              <Link href={buildNavHref("")}>Dashboard</Link>
            )
          }
        />

        {PROJECT_ADMIN_DASHBOARD_NAVLINKS.map((group, groupIndex) => (
          <div key={groupIndex} className="flex flex-col">
            <p className="text-muted-foreground mt-2 mb-1 px-1 text-xs">
              {group.category}
            </p>
            {group.links.map((navLink, linkIndex) => {
              const active = isActive(navLink.segment);
              return (
                <Button
                  key={linkIndex}
                  variant={active ? "secondary" : "ghost"}
                  nativeButton={false}
                  className="justify-start rounded-lg"
                  render={
                    active ? (
                      <span>{navLink.label}</span>
                    ) : (
                      <Link href={buildNavHref(navLink.segment)}>
                        {navLink.label}
                      </Link>
                    )
                  }
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
