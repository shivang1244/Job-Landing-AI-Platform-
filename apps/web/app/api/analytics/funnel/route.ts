import { NextRequest } from "next/server";
import { ok } from "@/lib/http";
import { getUserId } from "@/lib/logic";
import { readDb } from "@/lib/data-store";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = getUserId(searchParams.get("userId"));
  const db = readDb();

  const byStage = {
    saved: 0,
    applied: 0,
    screen: 0,
    interview: 0,
    offer: 0,
    rejected: 0,
    withdrawn: 0
  };

  const items = db.applications.filter((app) => app.userId === userId);
  for (const app of items) {
    byStage[app.stage] += 1;
  }

  const total = items.length || 1;

  return ok({
    totalApplications: items.length,
    byStage,
    conversion: {
      appliedToScreen: Number(((byStage.screen / total) * 100).toFixed(1)),
      screenToInterview: Number(((byStage.interview / total) * 100).toFixed(1)),
      interviewToOffer: Number(((byStage.offer / total) * 100).toFixed(1))
    }
  });
}
