import { NextRequest } from "next/server";
import { writeDb } from "@/lib/data-store";
import { ok } from "@/lib/http";

export async function POST(_request: NextRequest) {
  writeDb({
    resumes: [],
    jobs: [],
    matches: [],
    recommendations: [],
    applications: [],
    followUps: [],
    referrals: [],
    interviewPacks: [],
    truthGuardResults: [],
    skillGapPlans: [],
    portfolioRecommendations: [],
    applyTimeRecommendations: [],
    outreachThreads: [],
    resumeVariants: [],
    resumeExperiments: []
  });

  return ok({ reset: true });
}
