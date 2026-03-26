import { NextRequest } from "next/server";
import { createId, nowIso, readDb, writeDb } from "@/lib/data-store";
import { badRequest, ok, notFound } from "@/lib/http";
import { getUserId } from "@/lib/logic";
import { ApplicationStage } from "@/lib/types";

function normalizeStage(input: unknown): ApplicationStage {
  const allowed: ApplicationStage[] = [
    "saved",
    "applied",
    "screen",
    "interview",
    "offer",
    "rejected",
    "withdrawn"
  ];

  if (typeof input === "string" && allowed.includes(input as ApplicationStage)) {
    return input as ApplicationStage;
  }

  return "saved";
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return badRequest("Invalid request body.");
  }

  const userId = getUserId((body as { userId?: string }).userId);
  const jobId = (body as { jobId?: string }).jobId;
  const resumeVariantId = (body as { resumeVariantId?: string }).resumeVariantId;
  const stage = normalizeStage((body as { stage?: string }).stage);

  if (!jobId) {
    return badRequest("jobId is required.");
  }

  const db = readDb();
  const job = db.jobs.find((item) => item.id === jobId);

  if (!job) {
    return notFound("Job not found.");
  }

  const existing = db.applications.find((item) => item.userId === userId && item.jobId === jobId);
  if (existing) {
    return ok({ application: existing, reused: true });
  }

  const application = {
    id: createId("app"),
    userId,
    jobId,
    jobSnapshotTitle: job.title,
    jobSnapshotCompany: job.company,
    resumeVariantId,
    stage,
    history: [
      {
        stage,
        source: "manual" as const,
        timestamp: nowIso(),
        note: "Application created"
      }
    ],
    createdAt: nowIso(),
    updatedAt: nowIso()
  };

  db.applications.push(application);
  writeDb(db);

  return ok({ application });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = getUserId(searchParams.get("userId"));
  const db = readDb();

  const applications = db.applications
    .filter((app) => app.userId === userId)
    .map((app) => {
      const job = db.jobs.find((row) => row.id === app.jobId);

      if (job) {
        return {
          ...app,
          job
        };
      }

      return {
        ...app,
        job: {
          title: app.jobSnapshotTitle ?? "Archived role",
          company: app.jobSnapshotCompany ?? "Archived company"
        }
      };
    })
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));

  return ok({ applications });
}
