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
    const base = `/dashboard/org/${orgSlug}/project/${projectSlug}/admin${segment ? `/${segment}` : ""}`;
    return pathname === base;
  };

  return (
    <div className="flex h-full min-w-50 flex-col gap-1 px-3 pt-18">
      {PROJECT_ADMIN_DASHBOARD_NAVLINKS.map((navLink, index) => {
        const active = isActive(navLink.segment);
        return (
          <Button
            key={index}
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
  );
};
