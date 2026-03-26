import { NextRequest } from "next/server";
import { createId, nowIso, readDb, writeDb } from "@/lib/data-store";
import { badRequest, ok } from "@/lib/http";
import { getUserId } from "@/lib/logic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = getUserId(searchParams.get("userId"));
  const db = readDb();

  return ok({
    outreach: db.outreachThreads
      .filter((thread) => thread.userId === userId)
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return badRequest("Invalid request body.");
  }

  const userId = getUserId((body as { userId?: string }).userId);
  const company = (body as { company?: string }).company;
  const contactChannel = (body as { contactChannel?: string }).contactChannel;
  const contactValue = (body as { contactValue?: string }).contactValue;
  const notes = (body as { notes?: string }).notes ?? "";

  if (!company || !contactChannel || !contactValue) {
    return badRequest("company, contactChannel and contactValue are required.");
  }

  const thread = {
    id: createId("outreach"),
    userId,
    company,
    contactChannel,
    contactValue,
    status: "new" as const,
    notes,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  const db = readDb();
  db.outreachThreads.push(thread);
  writeDb(db);

  return ok({ outreach: thread });
}
