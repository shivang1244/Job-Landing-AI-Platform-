import { NextRequest } from "next/server";
import { createId, nowIso, readDb, writeDb } from "@/lib/data-store";
import { badRequest, ok } from "@/lib/http";
import { getUserId } from "@/lib/logic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = getUserId(searchParams.get("userId"));
  const jobId = searchParams.get("jobId");
  const timezone = searchParams.get("timezone") ?? "Asia/Calcutta";

  if (!jobId) {
    return badRequest("jobId is required.");
  }

  const recommendation = {
    id: createId("applytime"),
    userId,
    jobId,
    timezone,
    recommendedWindow: "09:00-11:30 local time, Tuesday to Thursday",
    urgencyReason: "Job is recently posted and high-fit applications get faster recruiter review.",
    createdAt: nowIso()
  };

  const db = readDb();
  db.applyTimeRecommendations.push(recommendation);
  writeDb(db);

  return ok({ applyTimeRecommendation: recommendation });
}
