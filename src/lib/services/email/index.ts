import "server-only";

import { Resend } from "resend";

import { env } from "@/lib/env";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Sends transactional email. Only interview reminders and password resets use
 * email (Resend's free tier is capped); everything else is in-app.
 */
export interface EmailService {
  send(message: EmailMessage): Promise<void>;
}

export class ResendEmailService implements EmailService {
  private readonly client: Resend;

  constructor(
    apiKey: string,
    private readonly from: string,
  ) {
    this.client = new Resend(apiKey);
  }

  async send(message: EmailMessage): Promise<void> {
    const { error } = await this.client.emails.send({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
    });
    if (error) {
      throw new Error(`Email send failed: ${error.message}`);
    }
  }
}

/** Development fallback: prints emails to the server console. */
export class ConsoleEmailService implements EmailService {
  async send(message: EmailMessage): Promise<void> {
    console.info(
      `\n[email] to=${message.to}\n[email] subject=${message.subject}\n${message.text}\n`,
    );
  }
}

let instance: EmailService | null = null;

export function getEmailService(): EmailService {
  instance ??= env.RESEND_API_KEY
    ? new ResendEmailService(env.RESEND_API_KEY, env.EMAIL_FROM)
    : new ConsoleEmailService();
  return instance;
}
