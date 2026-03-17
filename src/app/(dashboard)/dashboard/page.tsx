import React from "react";

import { headers } from "next/headers";
import { checkAuthServer } from "~/lib/auth";
import { AvailableOrgs } from "~/components/dashboard";

const Dashboard: React.FC = async () => {
  const { session } = await checkAuthServer({
    headers: await headers(),
    redirectTo: "/login",
  });

  return (
    <div className="flex h-screen w-full flex-col pt-25">
      <div className="container mx-auto flex w-full flex-col gap-5">
        <h1 className="text-2xl">
          Hey {session?.user.name},{" "}
          <span className="text-muted-foreground">
            Welcome to the dashboard
          </span>
        </h1>
        <AvailableOrgs />
      </div>
    </div>
  );
};

export default Dashboard;
