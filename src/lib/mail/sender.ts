import { Resend } from "resend";
import { env } from "~/env";
import { renderWelcomeEmail, renderInvitationEmail } from "./render";
import { FROM_EMAIL } from "../constants";

const resend = new Resend(env.RESEND_API_KEY);

// ─── Welcome email ────────────────────────────────────────────────────────────

interface WelcomeEmailParams {
  email: string;
  name: string;
}

export const sendWelcomeEmail = async (
  params: WelcomeEmailParams,
): Promise<void> => {
  try {
    // const { html, text } = await renderWelcomeEmail(params.name);
    // const result = await resend.emails.send({
    //   from: FROM_EMAIL,
    //   to: params.email,
    //   subject: "Welcome to SimpleCMS",
    //   html,
    //   text,
    // });
    // if (result.error) {
    //   console.error("[Email] [Welcome] Error:", result.error);
    //   throw new Error(result.error.message);
    // }
  } catch (error) {
    console.error("[Email] [Welcome] Exception:", error);
    throw error;
  }
};

// ─── Invitation email ─────────────────────────────────────────────────────────

interface InvitationEmailParams {
  email: string;
  orgName: string;
  inviteCode: string;
  role: "admin" | "manager";
  inviterName: string;
  expiresAt: Date;
}

export const sendInvitationEmail = async (
  params: InvitationEmailParams,
): Promise<void> => {
  try {
    // const { html, text } = await renderInvitationEmail({
    //   inviterName: params.inviterName,
    //   orgName: params.orgName,
    //   inviteCode: params.inviteCode,
    //   role: params.role,
    //   expiresAt: params.expiresAt,
    // });

    // const roleLabel = params.role === "admin" ? "Admin" : "Manager";

    // const result = await resend.emails.send({
    //   from: FROM_EMAIL,
    //   to: params.email,
    //   subject: `You've been invited to join ${params.orgName} as ${roleLabel}`,
    //   html,
    //   text,
    // });

    // if (result.error) {
    //   console.error("[Email] [Invitation] Error:", result.error);
    //   throw new Error(result.error.message);
    // }

    console.log("[Email] [Invitation]", {
      inviterName: params.inviterName,
      orgName: params.orgName,
      inviteCode: params.inviteCode,
      role: params.role,
      expiresAt: params.expiresAt,
    });
  } catch (error) {
    console.error("[Email] [Invitation] Exception:", error);
    throw error;
  }
};
