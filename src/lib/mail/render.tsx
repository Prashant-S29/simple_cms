import { render } from "@react-email/render";
import { WelcomeEmail, InvitationEmail } from "~/components/email";

export async function renderWelcomeEmail(userName: string) {
  const html = await render(<WelcomeEmail userName={userName} />);
  const text = await render(<WelcomeEmail userName={userName} />, {
    plainText: true,
  });

  return { html, text };
}

interface RenderInvitationEmailParams {
  inviterName: string;
  orgName: string;
  inviteCode: string;
  role: "admin" | "manager";
  expiresAt: Date;
}

export async function renderInvitationEmail(
  params: RenderInvitationEmailParams,
) {
  const element = (
    <InvitationEmail
      inviterName={params.inviterName}
      orgName={params.orgName}
      inviteCode={params.inviteCode}
      role={params.role}
      expiresAt={params.expiresAt}
    />
  );

  const html = await render(element);
  const text = await render(element, { plainText: true });

  return { html, text };
}
