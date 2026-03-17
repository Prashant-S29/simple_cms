import React from "react";
import { ContinueWithGoogle } from "~/components/auth";

interface Props {
  searchParams: Promise<{ redirectTo?: string }>;
}

const Login: React.FC<Props> = async ({ searchParams }) => {
  const { redirectTo } = await searchParams;
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-5">
      <div className="flex flex-col items-center">
        <div className="bg-muted size-12 rounded-full" />
        <h1 className="mt-2 text-lg font-medium">SimpleCMS</h1>
        <p className="text-muted-foreground">A simpler way to build CMS</p>
      </div>
      <ContinueWithGoogle redirectTo={redirectTo} />
    </div>
  );
};

export default Login;
