const rawAdminEmails = process.env.ADMIN_EMAIL_ALLOWLIST ?? "";
const assistantIngestToken = process.env.ASSISTANT_INGEST_TOKEN ?? "";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getAdminEmailAllowlist() {
  return rawAdminEmails
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  return getAdminEmailAllowlist().includes(normalizeEmail(email));
}

export function getAssistantIngestToken() {
  if (!assistantIngestToken) {
    throw new Error(
      "ASSISTANT_INGEST_TOKEN is missing. Set it before enabling internal assistant ingestion.",
    );
  }

  return assistantIngestToken;
}
