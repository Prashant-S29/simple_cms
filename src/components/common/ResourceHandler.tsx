import React from "react";
import { Spinner } from "../ui/spinner";
import { Button } from "../ui/button";
import Link from "next/link";

interface Props {
  state: "loading" | "not_found";
}

export const ResourceHandler: React.FC<Props> = ({ state }) => {
  if (state === "loading") {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (state === "not_found") {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center text-center">
        <h2 className="text-xl font-medium">Resource Not found</h2>
        <p className="text-muted-foreground mt-1 max-w-lg">
          The requested resource could not be found. If you think it&apos;s a
          bug, please submit a{" "}
          <Link href="/" className="text-primary underline underline-offset-2">
            bug report
          </Link>
          .
        </p>

        <Button
          render={<Link href="/">Back to Home</Link>}
          nativeButton={false}
          className="mt-5"
        ></Button>
      </div>
    );
  }

  return null;
};
