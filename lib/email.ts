const RESEND_API_URL = "https://api.resend.com/emails";
const FALLBACK_ORDER_EMAIL_RECIPIENTS = [
  "burusakos@yahoo.co.uk",
  "proprintkiado@gmail.com",
] as const;
const FALLBACK_ORDER_EMAIL_FROM = "Pro-Print Kiadó <onboarding@resend.dev>";

type SendEmailParams = {
  to: string | string[];
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

export function getOrderNotificationRecipients() {
  const configuredRecipients = (process.env.ORDER_EMAIL_TO ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(
    new Set([...configuredRecipients, ...FALLBACK_ORDER_EMAIL_RECIPIENTS]),
  );
}

export async function sendEmail({ to, subject, text, html }: SendEmailParams) {
  const recipients = Array.isArray(to) ? to : [to];

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getRequiredResendApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getOrderEmailFrom(),
      to: recipients,
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
