import { NextRequest } from "next/server";
import { createId, nowIso, readDb, writeDb } from "@/lib/data-store";
import { badRequest, notFound, ok } from "@/lib/http";
import { getUserId } from "@/lib/logic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = getUserId(searchParams.get("userId"));
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return badRequest("jobId query param is required.");
  }

  const db = readDb();
  const job = db.jobs.find((item) => item.id === jobId);

  if (!job) {
    return notFound("Job not found.");
  }

  let leads = db.referrals.filter((lead) => lead.userId === userId && lead.jobId === jobId);

  if (leads.length === 0) {
    leads = (job.publicRecruiterProfiles || []).map((profileUrl, idx) => ({
      id: createId("ref"),
      userId,
      jobId,
      company: job.company,
      profileUrl,
      messageDraft: `Hi, I noticed the ${job.title} role at ${job.company}. I would appreciate any guidance on the hiring process and can share a tailored profile if helpful.`,
      createdAt: nowIso()
    }));

    db.referrals.push(...leads);
    writeDb(db);
  }

  return ok({ referrals: leads });
}
