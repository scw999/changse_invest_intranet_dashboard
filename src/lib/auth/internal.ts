import { getAssistantIngestToken } from "@/lib/auth/config";

export function assertInternalAssistantRequest(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${getAssistantIngestToken()}`;

  if (authHeader !== expected) {
    throw new Error("Unauthorized internal ingest request.");
  }
}
