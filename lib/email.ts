const RESEND_API_URL = "https://api.resend.com/emails";
const FALLBACK_ORDER_EMAIL_TO = "burusakos@yahoo.co.uk";
const FALLBACK_ORDER_EMAIL_FROM = "Pro-Print Kiadó <onboarding@resend.dev>";

type SendEmailParams = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function getRequiredResendApiKey() {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("A RESEND_API_KEY nincs beállítva.");
  }

  return apiKey;
}

function getOrderEmailFrom() {
  return process.env.ORDER_EMAIL_FROM?.trim() || FALLBACK_ORDER_EMAIL_FROM;
}

export function getOrderNotificationRecipient() {
  return process.env.ORDER_EMAIL_TO?.trim() || FALLBACK_ORDER_EMAIL_TO;
}

export async function sendEmail({ to, subject, text, html }: SendEmailParams) {
  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getRequiredResendApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getOrderEmailFrom(),
      to: [to],
      subject,
      text,
      html,
    }),
  });

  if (response.ok) {
    return;
  }

  const errorPayload = (await response.json().catch(() => null)) as
    | { message?: string; error?: string }
    | null;

  throw new Error(
    errorPayload?.message || errorPayload?.error || "Nem sikerült elküldeni az emailt.",
  );
}
