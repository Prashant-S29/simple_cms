import type { Metadata } from "next";
import { headers } from "next/headers";
import { ResourceHandler } from "~/components/common";
import { checkAuthServer } from "~/lib/auth";
import { SettingsPage } from "./SettingsPage";

interface Props {
  params: Promise<{ orgSlug: string }>;
}

export const metadata: Metadata = {
  title: "Team – SimpleCMS",
  description: "Manage your organization's members and invitations.",
};

const SettingsPageHandler = async ({ params }: Props) => {
  const { orgSlug } = await params;

  const { session } = await checkAuthServer({
    headers: await headers(),
    redirectTo: "/login",
  });

  if (!session) return <ResourceHandler state="loading" />;

  return <SettingsPage slug={orgSlug} userId={session.user.id} />;
};

export default SettingsPageHandler;
