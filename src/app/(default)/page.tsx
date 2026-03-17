import React from "react";
import Link from "next/link";

import { Button } from "~/components/ui/button";

const Home: React.FC = () => {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
      <section className="text-center">
        <h1 className="text-xl font-medium">A Simple CMS builder</h1>
        <p className="text-muted-foreground">
          The goal is to help you build a simple CMS to help you with your
          freelance projects
        </p>
      </section>

      <Button
        render={<Link href="/dashboard">Get Started</Link>}
        nativeButton={false}
      ></Button>
    </div>
  );
};

export default Home;
