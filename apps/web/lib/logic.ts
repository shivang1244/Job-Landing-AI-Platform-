import { readDb, writeDb } from "@/lib/data-store";
import { JobPosting, JobMatch } from "@/lib/types";

export function getUserId(input: unknown): string {
  if (typeof input === "string" && input.trim()) {
    return input;
  }

  return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function saveJobsReplacingExisting(incoming: JobPosting[]) {
  const db = readDb();
  const existingByApplyUrl = new Map(db.jobs.map((job) => [job.applyUrl, job]));

  for (const job of incoming) {
    existingByApplyUrl.set(job.applyUrl, job);
  }

  db.jobs = [...existingByApplyUrl.values()];
  writeDb(db);
}

export function saveMatchesForResume(userId: string, resumeId: string, matches: JobMatch[]) {
  const db = readDb();
  db.matches = db.matches.filter((m) => !(m.userId === userId && m.resumeId === resumeId));
  db.matches.push(...matches);
  writeDb(db);
}
