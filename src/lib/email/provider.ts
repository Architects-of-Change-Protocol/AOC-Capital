export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailDeliveryResult = {
  ok: boolean;
  provider: string;
  messageId?: string;
  attemptedAt: string;
  sentAt?: string;
  failedAt?: string;
  error?: string;
};

const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER?.toLowerCase() ?? "resend";
const EMAIL_FROM = process.env.EMAIL_FROM ?? "PMFreak Founder <founder@pmfreak.com>";

export function getEmailProviderConfig() {
  if (EMAIL_PROVIDER === "resend") {
    return {
      provider: "resend",
      configured: Boolean(process.env.RESEND_API_KEY),
      from: EMAIL_FROM,
    };
  }

  return { provider: EMAIL_PROVIDER, configured: false, from: EMAIL_FROM };
}

export async function sendEmail(message: EmailMessage): Promise<EmailDeliveryResult> {
  const attemptedAt = new Date().toISOString();
  const config = getEmailProviderConfig();

  if (!config.configured) {
    const error = `Email provider is not configured. Set RESEND_API_KEY for provider '${config.provider}'.`;
    console.error(error);
    return { ok: false, provider: config.provider, attemptedAt, failedAt: new Date().toISOString(), error };
  }

  if (config.provider !== "resend") {
    const error = `Unsupported email provider '${config.provider}'.`;
    return { ok: false, provider: config.provider, attemptedAt, failedAt: new Date().toISOString(), error };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: config.from, to: [message.to], subject: message.subject, html: message.html, text: message.text }),
    });

    const payload = await response.json();

    if (!response.ok) {
      const error = payload?.message ?? `Provider request failed with status ${response.status}`;
      return { ok: false, provider: config.provider, attemptedAt, failedAt: new Date().toISOString(), error };
    }

    return {
      ok: true,
      provider: config.provider,
      messageId: typeof payload?.id === "string" ? payload.id : undefined,
      attemptedAt,
      sentAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ok: false,
      provider: config.provider,
      attemptedAt,
      failedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown email provider error",
    };
  }
}
