import React from "react";
import Link from "next/link";

import { Button } from "~/components/ui/button";
import { checkAuthServer } from "~/lib/auth";
import { headers } from "next/headers";

const Welcome: React.FC = async () => {
  const { session } = await checkAuthServer({
    headers: await headers(),
    redirectTo: "/login",
  });

  return (
    <div className="flex h-screen w-full flex-col justify-center gap-4">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <section>
          <h1 className="text-2xl font-medium">
            Hey {(session?.user?.name ?? "unknon").split(" ")[0]},{" "}
            <span className="text-muted-foreground">Welcome to SimpleCMS</span>
          </h1>
          <p className="text-muted-foreground">
            Let&apos;s help you get started.
          </p>
        </section>

        <div className="grid grid-cols-3 gap-5">
          <div className="bg-muted col-span-2 h-80 w-full rounded-2xl"></div>
          <div className="bg-muted h-80 w-full rounded-2xl"></div>
        </div>

        <div>
          <Button
            render={<Link href="/dashboard">Continue to Dashboard</Link>}
            nativeButton={false}
          ></Button>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
