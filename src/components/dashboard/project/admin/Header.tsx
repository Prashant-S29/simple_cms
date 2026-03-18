"use client";

import React from "react";
// import { ChevronRightIcon } from "lucide-react";
import { OrgSelector } from "~/components/dashboard/org/OrgSelector";
import { ProjectSelector } from "~/components/dashboard/project/ProjectSelector";

export const ProjectAdminHeader: React.FC = () => {
  return (
    <div className="bg-background fixed top-0 z-20 flex h-16 w-full items-center justify-between px-1">
      <div className="flex items-center gap-5 text-sm">
        <OrgSelector />
        <div className="w-0.5 bg-accent rounded-full h-4 rotate-12"/>
        <ProjectSelector />
      </div>

      <div>{/* <ProfileDropdown /> */}</div>
    </div>
  );
};
