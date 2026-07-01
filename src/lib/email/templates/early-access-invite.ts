const PMFREAK_DESCRIPTION = "PMFreak helps leaders turn messy execution signals into clear, calm operational decisions for their team.";

export function buildEarlyAccessInviteEmail(input: {
  recipientEmail: string;
  activationLink: string;
  expiresAt: string;
  founderNote?: string | null;
}) {
  const expiresDate = new Date(input.expiresAt).toLocaleDateString();
  const note = input.founderNote?.trim();

  const subject = "Your PMFreak early-access invitation";
  const greeting = `Hi ${input.recipientEmail},`;
  const noteBlock = note
    ? `<p style=\"margin: 0 0 16px; color: #dbeafe;\"><strong>A note from the founder:</strong><br/>${escapeHtml(note)}</p>`
    : "";

  const html = `
  <div style="font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial; background: #020617; color: #e2e8f0; padding: 24px;">
    <div style="max-width: 640px; margin: 0 auto; border: 1px solid rgba(148,163,184,0.3); border-radius: 16px; background: rgba(15, 23, 42, 0.9); padding: 24px;">
      <p style="margin: 0 0 12px; color: #bae6fd; font-size: 12px; letter-spacing: .08em; text-transform: uppercase;">PMFreak Founder Early Access</p>
      <p style="margin: 0 0 16px;">${greeting}</p>
      <p style="margin: 0 0 16px;">I’d like to personally invite you into PMFreak with a 90-day early-access trial.</p>
      ${noteBlock}
      <p style="margin: 0 0 16px;">${PMFREAK_DESCRIPTION}</p>
      <p style="margin: 0 0 16px;">Your workspace stays under your control. PMFreak is built to be explicit about actions and cautious with operational context.</p>
      <p style="margin: 0 0 20px;">This secure invite link expires on <strong>${expiresDate}</strong>.</p>
      <p style="margin: 0 0 20px;"><a href="${input.activationLink}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#67e8f9;color:#082f49;text-decoration:none;font-weight:700;">Activate early access</a></p>
      <p style="margin: 0; color: #94a3b8; font-size: 12px;">If the button doesn’t work, use this secure link: ${input.activationLink}</p>
    </div>
  </div>`;

  const text = `${greeting}\n\nI'd like to personally invite you into PMFreak with a 90-day early-access trial.\n\n${note ? `A note from the founder: ${note}\n\n` : ""}${PMFREAK_DESCRIPTION}\n\nYour workspace stays under your control, and PMFreak is designed to handle operational context carefully.\n\nActivate early access: ${input.activationLink}\nThis link expires on ${expiresDate}.`;

  return { subject, html, text };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
