import { NextRequest } from "next/server";
import { createId, nowIso, readDb, writeDb } from "@/lib/data-store";
import { badRequest, ok } from "@/lib/http";
import { getUserId } from "@/lib/logic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = getUserId(searchParams.get("userId"));
  const resumeId = searchParams.get("resumeId");
  const jobId = searchParams.get("jobId");

  if (!resumeId || !jobId) {
    return badRequest("resumeId and jobId are required.");
  }

  const db = readDb();
  const match = db.matches.find((item) => item.userId === userId && item.resumeId === resumeId && item.jobId === jobId);
  const missing = match?.missingKeywords ?? [];

  const plan = {
    id: createId("skillgap"),
    userId,
    jobId,
    quickWins: missing.slice(0, 5).map((keyword) => `Add evidence bullet for '${keyword}' from existing work.`),
    mediumTerm: missing.slice(5, 10).map((keyword) => `Build mini project demonstrating '${keyword}'.`),
    createdAt: nowIso()
  };

  db.skillGapPlans.push(plan);
  writeDb(db);

  return ok({ skillGapPlan: plan });
}
