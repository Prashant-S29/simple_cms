import { Resend } from "resend";
import { env } from "~/env";
import { renderWelcomeEmail } from "./render";
import { FROM_EMAIL } from "../constants";

const resend = new Resend(env.RESEND_API_KEY);

interface WelcomeEmailParams {
  email: string;
  name: string;
}

export const sendWelcomeEmail = async (
  params: WelcomeEmailParams,
): Promise<void> => {
  try {
    const { html, text } = await renderWelcomeEmail(params.name);

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.email,
      subject: "Welcome to SimpleCMS",
      html,
      text,
    });

    if (result.error) {
      console.error("[Email] [Welcome] Error:", result.error);
      throw new Error(result.error.message);
    }
  } catch (error) {
    console.error("[Email] Exception:", error);
    throw error;
  }
};

interface EmailVerificationParams {
  email: string;
  name: string;
  url: string;
}
