import { NextRequest } from "next/server";
import { nowIso, readDb, writeDb } from "@/lib/data-store";
import { badRequest, notFound, ok } from "@/lib/http";
import { getUserId } from "@/lib/logic";
import { ApplicationStage } from "@/lib/types";

const stages: ApplicationStage[] = [
  "saved",
  "applied",
  "screen",
  "interview",
  "offer",
  "rejected",
  "withdrawn"
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return badRequest("Invalid request body.");
  }

  const userId = getUserId((body as { userId?: string }).userId);
  const stage = (body as { stage?: ApplicationStage }).stage;
  const source = (body as { source?: "manual" | "email_detected" | "integration" }).source ?? "manual";
  const note = (body as { note?: string }).note;

  if (!stage || !stages.includes(stage)) {
    return badRequest("Valid stage is required.");
  }

  const db = readDb();
  const application = db.applications.find((app) => app.id === params.id && app.userId === userId);

  if (!application) {
    return notFound("Application not found.");
  }

  application.stage = stage;
  application.updatedAt = nowIso();
  application.history.push({
    stage,
    source,
    timestamp: nowIso(),
    note
  });

  if (stage !== "applied") {
    for (const task of db.followUps) {
      if (task.applicationId === application.id && task.status === "pending") {
        task.status = "canceled";
      }
    }
  }

  writeDb(db);

  return ok({ application });
}
