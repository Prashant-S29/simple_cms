import * as React from "react";
import { Section, Text, Button, Hr } from "@react-email/components";

interface InvitationEmailProps {
  inviterName: string;
  orgName: string;
  inviteCode: string;
  role: "admin" | "manager";
  expiresAt: Date;
}

export const InvitationEmail: React.FC<InvitationEmailProps> = ({
  inviterName,
  orgName,
  inviteCode,
  role,
  expiresAt,
}) => {
  const joinUrl = `http://localhost:3000/dashboard/org/join`;

  const roleLabel = role === "admin" ? "Admin" : "Manager";

  const formattedExpiry = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(expiresAt);

  return (
    <Section>
      <Text className="mb-4 text-base leading-relaxed text-[#ffffff]">
        Hey there,
      </Text>

      <Text className="mb-4 text-base leading-relaxed text-[#E2E2E2]">
        <strong>{inviterName}</strong> has invited you to join{" "}
        <strong>{orgName}</strong> on SimpleCMS as a{" "}
        <strong>{roleLabel}</strong>.
      </Text>

      <Text className="mb-2 text-sm leading-relaxed text-[#E2E2E2]">
        Use the invite code below to accept your invitation:
      </Text>

      <Section className="my-4 rounded-[8px] bg-[#1a1a1a] px-6 py-4 text-center">
        <Text className="m-0 font-mono text-2xl font-bold tracking-widest text-[#ffffff]">
          {inviteCode}
        </Text>
      </Section>

      <Section className="my-5">
        <Button
          className="inline-block rounded-[6.6px] bg-[#E7E7E7] px-4 py-2 text-center text-sm font-medium text-[#000000] no-underline"
          href={joinUrl}
        >
          Accept Invitation
        </Button>
      </Section>

      <Hr className="my-4 border-[#333333]" />

      <Text className="text-xs text-[#888888]">
        This invitation will expire on <strong>{formattedExpiry}</strong>. If
        you did not expect this invitation, you can safely ignore this email.
      </Text>

      <Text className="mt-2 text-xs text-[#888888]">
        To accept manually, visit{" "}
        <span className="text-[#aaaaaa]">{joinUrl}</span> and enter your invite
        code.
      </Text>
    </Section>
  );
};
