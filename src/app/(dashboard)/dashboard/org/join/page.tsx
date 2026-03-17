import type { Metadata } from "next";
import { JoinOrgPage } from "./JoinOrgPage";

export const metadata: Metadata = {
  title: "Join Organization – SimpleCMS",
  description: "Accept your invitation and join an organization on SimpleCMS.",
};

export default function Page() {
  return <JoinOrgPage />;
}
