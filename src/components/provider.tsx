"use client";

import { ThemeProvider } from "next-themes";
import { useMount, useIsMobile } from "~/hooks";
import { Toaster } from "sonner";
import { TRPCReactProvider } from "~/trpc/react";
import { TooltipProvider } from "./ui/tooltip";

export const Provider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const isMounted = useMount();
  const isMobile = useIsMobile();

  if (!isMounted) {
    return null;
  }

  if (isMobile) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center p-5">
        <div className="flex flex-col items-center">
          <div className="bg-muted size-12 rounded-full" />
          <h1 className="mt-2 text-lg font-medium">SimpleCMS</h1>
          <p className="text-muted-foreground">A simpler way to build CMS</p>
        </div>
        <p className="text-muted-foreground bg-card mt-5 rounded-full border px-4 py-2 text-center text-sm">
          Use a desktop device for better experience.
        </p>
      </div>
    );
  }

  return (
    <TRPCReactProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        disableTransitionOnChange
      >
        <TooltipProvider>
          <Toaster richColors />
          {children}
        </TooltipProvider>
      </ThemeProvider>
    </TRPCReactProvider>
  );
};
