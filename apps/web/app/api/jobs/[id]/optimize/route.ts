import { NextRequest } from "next/server";
import { createId, nowIso, readDb, writeDb } from "@/lib/data-store";
import { badRequest, notFound, ok } from "@/lib/http";
import { getUserId } from "@/lib/logic";
import { computeFitScore, extractYearsOfExperience } from "@/lib/matching";
import { generateAtsArtifacts } from "@/lib/openrouter";

function detectTruthWarnings(resumeText: string, tailoredResume: string, keywords: string[]) {
  const warnings: string[] = [];
  const lowerResume = resumeText.toLowerCase();

  for (const keyword of keywords) {
    if (!lowerResume.includes(keyword.toLowerCase())) {
      warnings.push(`Keyword '${keyword}' is not directly evidenced in source resume.`);
    }
  }

  if (tailoredResume.length > resumeText.length * 2.5) {
    warnings.push("Tailored resume appears much longer than source; review for unnecessary additions.");
  }

  const sourceYears = extractYearsOfExperience(resumeText);
  const generatedYears = extractYearsOfExperience(tailoredResume);
  if (generatedYears > sourceYears) {
    warnings.push(
      `Generated resume claims ${generatedYears} year(s) but source evidence is ${sourceYears}. Edit before applying.`
    );
  }

  return warnings.slice(0, 10);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return badRequest("Invalid request body.");
  }

  const userId = getUserId((body as { userId?: string }).userId);
  const resumeId = (body as { resumeId?: string }).resumeId;

  if (!resumeId) {
    return badRequest("resumeId is required.");
  }

  const db = readDb();
  const job = db.jobs.find((item) => item.id === params.id);
  const resume = db.resumes.find((item) => item.id === resumeId && item.userId === userId);

  if (!job) {
    return notFound("Job not found.");
  }

  if (!resume) {
    return notFound("Resume not found.");
  }

  const fit = computeFitScore(resume.rawText, job, resume.experienceLevel);
  const modelOutput = await generateAtsArtifacts({
    resumeText: resume.rawText,
    resumeYears: resume.parsedYears,
    experienceLabel: resume.experienceLabel,
    jobTitle: job.title,
    company: job.company,
    jobDescription: job.description,
    keywordGap: fit.missingKeywords
  });

  const truthWarnings = [
    ...modelOutput.warnings,
    ...detectTruthWarnings(resume.rawText, modelOutput.tailoredResume, fit.missingKeywords)
  ];

  const recommendation = {
    id: createId("ats"),
    userId,
    resumeId,
    jobId: job.id,
    keywordGap: fit.missingKeywords,
    tailoredResume: modelOutput.tailoredResume,
    tailoredCoverLetter: modelOutput.tailoredCoverLetter,
    truthGuardWarnings: truthWarnings,
    createdAt: nowIso()
  };

  const variant = {
    id: createId("variant"),
    userId,
    resumeId,
    jobId: job.id,
    tailoredResume: modelOutput.tailoredResume,
    tailoredCoverLetter: modelOutput.tailoredCoverLetter,
    keywordGaps: fit.missingKeywords,
    warnings: truthWarnings,
    createdAt: nowIso()
  };

  db.recommendations.push(recommendation);
  db.resumeVariants.push(variant);
  db.truthGuardResults.push({
    id: createId("truth"),
    userId,
    jobId: job.id,
    warnings: truthWarnings,
    blockedClaims: truthWarnings
      .filter((w) => w.includes("not directly evidenced"))
      .map((w) => w.replace("Keyword '", "").replace("' is not directly evidenced in source resume.", "")),
    createdAt: nowIso()
  });

  writeDb(db);

  return ok({
    job,
    fit,
    recommendation,
    variant
  });
}
