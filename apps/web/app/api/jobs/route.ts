import { NextRequest } from "next/server";
import { ok } from "@/lib/http";
import { getUserId } from "@/lib/logic";
import { readDb } from "@/lib/data-store";
import { ExperienceLevel } from "@/lib/types";
import { isRecentWithinHours } from "@/lib/matching";

function riskWeight(risk: "low" | "medium" | "high"): number {
  if (risk === "low") {
    return 1;
  }

  if (risk === "medium") {
    return 2;
  }

  return 3;
}

function levelWeight(level: ExperienceLevel): number {
  if (level === "level0") {
    return 0;
  }

  if (level === "level1") {
    return 1;
  }

  return 2;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = getUserId(searchParams.get("userId"));
  const resumeId = searchParams.get("resumeId");
  const country = searchParams.get("country")?.toLowerCase();
  const location = searchParams.get("location")?.toLowerCase();
  const minScore = Number(searchParams.get("minScore") ?? "0");
  const riskMax = (searchParams.get("riskMax") as "low" | "medium" | "high" | null) ?? "high";
  const requestedLevel = (searchParams.get("experienceLevel") as ExperienceLevel | null) ?? null;
  const postingWindow = searchParams.get("postingWindow") ?? "7d";

  const db = readDb();
  const matches = db.matches.filter((m) => m.userId === userId && (!resumeId || m.resumeId === resumeId));

  const resume = resumeId ? db.resumes.find((item) => item.id === resumeId && item.userId === userId) : null;
  const baselineLevel = requestedLevel ?? resume?.experienceLevel ?? "level1";
  const postingWindowHours =
    postingWindow === "1h" ? 1 : postingWindow === "3d" ? 72 : postingWindow === "15d" ? 360 : 168;

  const rows = matches
    .map((match) => {
      const job = db.jobs.find((j) => j.id === match.jobId);
      if (!job) {
        return null;
      }

      return {
        ...job,
        experienceLevel: job.experienceLevel ?? "level1",
        fitScore: match.fitScore,
        reasons: match.reasons,
        missingKeywords: match.missingKeywords
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .filter((row) => row.fitScore >= minScore)
    .filter((row) => (!country ? true : row.country.toLowerCase().includes(country)))
    .filter((row) =>
      !location
        ? true
        : location === "remote"
          ? row.remoteType === "remote" || row.remoteType === "hybrid" || row.location.toLowerCase() === "remote"
          : row.location.toLowerCase().includes(location) || row.location.toLowerCase() === "remote"
    )
    .filter((row) => riskWeight(row.risk) <= riskWeight(riskMax))
    .filter((row) => Math.abs(levelWeight(row.experienceLevel) - levelWeight(baselineLevel)) <= 1)
    .filter((row) => isRecentWithinHours(row.postedAt, postingWindowHours))
    .sort((a, b) => b.fitScore - a.fitScore);

  return ok({ jobs: rows, total: rows.length });
}
