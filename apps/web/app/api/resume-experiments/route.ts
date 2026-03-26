import { NextRequest } from "next/server";
import { createId, nowIso, readDb, writeDb } from "@/lib/data-store";
import { badRequest, ok } from "@/lib/http";
import { getUserId } from "@/lib/logic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return badRequest("Invalid request body.");
  }

  const userId = getUserId((body as { userId?: string }).userId);
  const resumeVariantId = (body as { resumeVariantId?: string }).resumeVariantId;
  const jobCategory = (body as { jobCategory?: string }).jobCategory ?? "general";
  const outcome =
    (body as { outcome?: "unknown" | "callback" | "interview" | "rejected" }).outcome ?? "unknown";

  if (!resumeVariantId) {
    return badRequest("resumeVariantId is required.");
  }

  const experiment = {
    id: createId("exp"),
    userId,
    resumeVariantId,
    jobCategory,
    outcome,
    createdAt: nowIso()
  };

  const db = readDb();
  db.resumeExperiments.push(experiment);
  writeDb(db);

  return ok({ resumeExperiment: experiment });
}
