import { NextRequest } from "next/server";
import { createId, nowIso, readDb, writeDb } from "@/lib/data-store";
import { badRequest, notFound, ok } from "@/lib/http";
import { getUserId } from "@/lib/logic";
import { createDefaultInterviewPack } from "@/lib/seeds";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return badRequest("Invalid request body.");
  }

  const userId = getUserId((body as { userId?: string }).userId);
  const jobId = (body as { jobId?: string }).jobId;

  if (!jobId) {
    return badRequest("jobId is required.");
  }

  const db = readDb();
  const job = db.jobs.find((item) => item.id === jobId);

  if (!job) {
    return notFound("Job not found.");
  }

  const template = createDefaultInterviewPack(job.title, job.company);
  const pack = {
    id: createId("pack"),
    userId,
    jobId,
    questions: template.questions,
    starAnswers: template.starAnswers,
    domainQuestions: template.domainQuestions,
    plan30_60_90: template.plan30_60_90,
    createdAt: nowIso()
  };

  db.interviewPacks.push(pack);
  writeDb(db);

  return ok({ interviewPack: pack });
}
