import { NextRequest } from "next/server";
import { createId, nowIso, readDb, writeDb } from "@/lib/data-store";
import { badRequest, ok } from "@/lib/http";
import { getUserId } from "@/lib/logic";
import { tokenize } from "@/lib/matching";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return badRequest("Invalid request body.");
  }

  const userId = getUserId((body as { userId?: string }).userId);
  const jobId = (body as { jobId?: string }).jobId ?? "unknown-job";
  const resumeText = (body as { resumeText?: string }).resumeText ?? "";
  const generatedText = (body as { generatedText?: string }).generatedText ?? "";

  if (!resumeText || !generatedText) {
    return badRequest("resumeText and generatedText are required.");
  }

  const resumeTokens = new Set(tokenize(resumeText));
  const generatedTokens = Array.from(new Set(tokenize(generatedText))).slice(0, 200);

  const unsupported = generatedTokens.filter((token) => !resumeTokens.has(token)).slice(0, 20);
  const warnings = unsupported.length
    ? ["Generated content contains terms not found in source resume. Validate before applying."]
    : [];

  const result = {
    id: createId("truth"),
    userId,
    jobId,
    warnings,
    blockedClaims: unsupported,
    createdAt: nowIso()
  };

  const db = readDb();
  db.truthGuardResults.push(result);
  writeDb(db);

  return ok({ result });
}
