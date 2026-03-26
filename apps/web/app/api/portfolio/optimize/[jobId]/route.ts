import { NextRequest } from "next/server";
import { createId, nowIso, readDb, writeDb } from "@/lib/data-store";
import { badRequest, notFound, ok } from "@/lib/http";
import { getUserId } from "@/lib/logic";

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { searchParams } = new URL(request.url);
  const userId = getUserId(searchParams.get("userId"));

  const db = readDb();
  const job = db.jobs.find((item) => item.id === params.jobId);

  if (!job) {
    return notFound("Job not found.");
  }

  const recommendation = {
    id: createId("portfolio"),
    userId,
    jobId: job.id,
    ordering: [
      "Most relevant AI/automation project first",
      "Production deployment project second",
      "Business impact analytics project third"
    ],
    rewriteTips: [
      "Quantify outcomes with percentage impact.",
      "Highlight tools requested in the JD.",
      "Move role-aligned projects above less relevant work."
    ],
    summarySnippet: `Portfolio demonstrates direct fit for ${job.title} through AI automation, production delivery, and measurable impact stories.`,
    createdAt: nowIso()
  };

  db.portfolioRecommendations.push(recommendation);
  writeDb(db);

  return ok({ portfolioRecommendation: recommendation });
}
