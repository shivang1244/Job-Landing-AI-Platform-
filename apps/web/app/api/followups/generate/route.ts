import { NextRequest } from "next/server";
import { createId, readDb, writeDb } from "@/lib/data-store";
import { badRequest, notFound, ok } from "@/lib/http";
import { getUserId } from "@/lib/logic";
import { buildReminderDraft, nowPlusDays } from "@/lib/seeds";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return badRequest("Invalid request body.");
  }

  const userId = getUserId((body as { userId?: string }).userId);
  const applicationId = (body as { applicationId?: string }).applicationId;

  if (!applicationId) {
    return badRequest("applicationId is required.");
  }

  const db = readDb();
  const application = db.applications.find((app) => app.id === applicationId && app.userId === userId);

  if (!application) {
    return notFound("Application not found.");
  }

  const job = db.jobs.find((item) => item.id === application.jobId);
  if (!job) {
    return notFound("Job not found for application.");
  }

  db.followUps = db.followUps.filter((f) => !(f.applicationId === applicationId && f.status === "pending"));

  const schedules = [3, 7, 14].map((day) => ({
    id: createId("followup"),
    userId,
    applicationId,
    dueAt: nowPlusDays(day),
    status: "pending" as const,
    draftMessage: buildReminderDraft(job.company, job.title, day),
    createdAt: new Date().toISOString()
  }));

  db.followUps.push(...schedules);
  writeDb(db);

  return ok({ followUps: schedules });
}
