import { NextRequest } from "next/server";
import { createId, nowIso, readDb, writeDb } from "@/lib/data-store";
import { badRequest, ok, notFound } from "@/lib/http";
import { getUserId } from "@/lib/logic";
import { computeFitScore, isRecentWithinDays } from "@/lib/matching";
import { ExperienceLevel } from "@/lib/types";
import { fetchLiveJobs } from "@/lib/live-jobs";
import { generateOutreachCompanies, generateSeedJobs } from "@/lib/seeds";

function normalizeLevel(input: unknown, resumeLevel: ExperienceLevel): ExperienceLevel {
  if (input === "level0" || input === "level1" || input === "level2") {
    return input;
  }

  return resumeLevel;
}

function normalizePostingWindow(input: unknown): number {
  if (input === "1h") {
    return 1 / 24;
  }

  if (input === "3d") {
    return 3;
  }

  if (input === "7d") {
    return 7;
  }

  if (input === "15d") {
    return 15;
  }

  return 7;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return badRequest("Invalid request body.");
  }

  const userId = getUserId((body as { userId?: string }).userId);
  const resumeId = (body as { resumeId?: string }).resumeId;
  const country = (body as { country?: string }).country ?? "Global";
  const location = (body as { location?: string }).location ?? "Remote";
  const postingWindowDays = normalizePostingWindow((body as { postingWindow?: string }).postingWindow);
  const appendResults = (body as { mode?: string }).mode === "append";
  const excludeJobIds = new Set(((body as { excludeJobIds?: string[] }).excludeJobIds ?? []).filter(Boolean));

  if (!resumeId) {
    return badRequest("resumeId is required.");
  }

  const db = readDb();
  const resume = db.resumes.find((item) => item.id === resumeId && item.userId === userId);

  if (!resume) {
    return notFound("Resume not found for user.");
  }

  const experienceLevel = normalizeLevel((body as { experienceLevel?: string }).experienceLevel, resume.experienceLevel);
  const requestedDomain = (body as { domain?: string }).domain?.trim() ?? "";
  const effectiveDomain =
    requestedDomain ||
    resume.parsedSkills
      .slice(0, 4)
      .join(" ")
      .trim() ||
    "ai";

  const seedJobs = generateSeedJobs({
    location,
    country,
    domain: effectiveDomain,
    resumeSkills: resume.parsedSkills,
    resumeRoles: resume.parsedRoles,
    experienceLevel,
    postingWindowDays,
    count: appendResults ? 120 : 80
  }).filter((job) => isRecentWithinDays(job.postedAt, Math.max(1, Math.ceil(postingWindowDays))));

  const liveJobs = await fetchLiveJobs({
    location,
    country,
    domain: effectiveDomain,
    experienceLevel,
    postingWindowDays,
    limit: appendResults ? 60 : 30
  }).catch(() => []);

  const generatedJobs = [...seedJobs, ...liveJobs].filter((job) => !excludeJobIds.has(job.id));

  const byApplyUrl = new Map(db.jobs.map((job) => [job.applyUrl, job]));
  for (const generated of generatedJobs) {
    const existing = byApplyUrl.get(generated.applyUrl);
    byApplyUrl.set(generated.applyUrl, existing ? { ...generated, id: existing.id } : generated);
  }
  db.jobs = [...byApplyUrl.values()];
  const persistedJobs = generatedJobs
    .map((job) => byApplyUrl.get(job.applyUrl))
    .filter((job): job is NonNullable<typeof job> => Boolean(job));

  const freshMatches = persistedJobs.map((job) => {
    const fit = computeFitScore(resume.rawText, job, experienceLevel);
    return {
      id: createId("match"),
      userId,
      resumeId,
      jobId: job.id,
      fitScore: fit.fitScore,
      reasons: fit.reasons,
      missingKeywords: fit.missingKeywords,
      createdAt: nowIso()
    };
  });

  if (!appendResults) {
    db.matches = db.matches.filter((m) => !(m.userId === userId && m.resumeId === resumeId));
    db.matches.push(...freshMatches);
  } else {
    const existingKeys = new Set(
      db.matches
        .filter((m) => m.userId === userId && m.resumeId === resumeId)
        .map((m) => `${m.resumeId}:${m.jobId}`)
    );

    for (const match of freshMatches) {
      const key = `${match.resumeId}:${match.jobId}`;
      if (!existingKeys.has(key)) {
        db.matches.push(match);
      }
    }
  }

  const outreachList = generateOutreachCompanies({
    domain: effectiveDomain,
    country,
    location,
    experienceLevel,
    count: 50
  });

  for (const company of outreachList) {
    const exists = db.outreachThreads.some(
      (thread) => thread.userId === userId && thread.company.toLowerCase() === company.company.toLowerCase()
    );

    if (!exists) {
      db.outreachThreads.push({
        id: createId("outreach"),
        userId,
        company: company.company,
        contactChannel: "careers_page",
        contactValue: company.officialContact,
        contactName: company.contactName,
        website: company.website,
        publicProfileUrl: company.publicRecruiterProfile,
        companyType: company.companyType,
        companySize: company.companySize,
        status: "new",
        notes: `Domain fit: ${company.domainFit}`,
        createdAt: nowIso(),
        updatedAt: nowIso()
      });
    }
  }

  writeDb(db);

  return ok({
    searchRun: {
      id: createId("searchrun"),
      userId,
      resumeId,
      country,
      location,
      domain: effectiveDomain,
      experienceLevel,
      postingWindowDays,
      mode: appendResults ? "append" : "replace",
      totalJobs: generatedJobs.length,
      generatedAt: nowIso()
    },
    topMatches: freshMatches.sort((a, b) => b.fitScore - a.fitScore).slice(0, 10),
    outreach: outreachList
  });
}
