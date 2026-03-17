import { render } from "@react-email/render";
import {
  WelcomeEmail,
} from "~/components/email";

export async function renderWelcomeEmail(userName: string) {
  const html = await render(<WelcomeEmail userName={userName} />);
  const text = await render(<WelcomeEmail userName={userName} />, {
    plainText: true,
  });

  return { html, text };
}
