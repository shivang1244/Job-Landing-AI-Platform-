import { NextRequest } from "next/server";
import { nowIso, readDb, writeDb } from "@/lib/data-store";
import { badRequest, notFound, ok } from "@/lib/http";
import { getUserId } from "@/lib/logic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return badRequest("Invalid request body.");
  }

  const userId = getUserId((body as { userId?: string }).userId);

  const db = readDb();
  const task = db.followUps.find((item) => item.id === params.id && item.userId === userId);

  if (!task) {
    return notFound("Follow-up task not found.");
  }

  task.status = "done";
  const app = db.applications.find((item) => item.id === task.applicationId);
  if (app) {
    app.updatedAt = nowIso();
  }

  writeDb(db);

  return ok({ followUp: task });
}
