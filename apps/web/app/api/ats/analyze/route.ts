import { NextRequest } from "next/server";
import { badRequest, ok, notFound } from "@/lib/http";
import { getUserId } from "@/lib/logic";
import { readDb } from "@/lib/data-store";
import { parseResumeText } from "@/lib/matching";
import { generateAtsArtifacts } from "@/lib/openrouter";
import { buildCustomJobFromJD, computeResumeAtsReadiness, detectTruthWarnings, scoreAgainstJD } from "@/lib/ats";

type AnalyzeBody = {
  userId?: string;
  resumeId?: string;
  resumeText?: string;
  jobDescription?: string;
  jobTitle?: string;
  company?: string;
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as AnalyzeBody | null;
  if (!body || typeof body !== "object") {
    return badRequest("Invalid request body.");
  }

  const userId = getUserId(body.userId);
  const resumeId = body.resumeId?.trim();
  const inlineText = body.resumeText?.trim();
  const jobDescription = body.jobDescription?.trim() ?? "";

  const db = readDb();
  const storedResume = resumeId
    ? db.resumes.find((item) => item.id === resumeId && item.userId === userId) ?? null
    : null;

  if (resumeId && !storedResume) {
    return notFound("Resume not found.");
  }

  const resumeText = inlineText || storedResume?.rawText || "";
  if (!resumeText) {
    return badRequest("resumeText or a valid resumeId is required.");
  }

  const parsedResume = parseResumeText(resumeText);
  const resumeAts = computeResumeAtsReadiness(resumeText);

  if (!jobDescription) {
    return ok({
      mode: "resume_only",
      resumeAts,
      resume: {
        parsedSkills: parsedResume.parsedSkills,
        parsedRoles: parsedResume.parsedRoles,
        parsedYears: parsedResume.parsedYears,
        experienceLevel: parsedResume.experienceLevel
      }
    });
  }

  const job = buildCustomJobFromJD({
    jobDescription,
    jobTitle: body.jobTitle,
    company: body.company
  });

  const before = scoreAgainstJD(resumeText, job, parsedResume.experienceLevel);
  const generated = await generateAtsArtifacts({
    resumeText,
    resumeYears: parsedResume.parsedYears,
    experienceLabel: parsedResume.experienceLabel,
    jobTitle: job.title,
    company: job.company,
    jobDescription: job.description,
    keywordGap: before.missingKeywords
  });
  let tailoredResume = generated.tailoredResume;
  let after = scoreAgainstJD(tailoredResume, job, parsedResume.experienceLevel);
  let boostWarning: string | null = null;

  if (after.fitScore <= before.fitScore && before.missingKeywords.length > 0) {
    const keywordBooster = [
      tailoredResume,
      "",
      "TARGET ROLE KEYWORDS",
      `- ${before.missingKeywords.slice(0, 10).join(" | ")}`
    ].join("\n");

    const boosted = scoreAgainstJD(keywordBooster, job, parsedResume.experienceLevel);
    if (boosted.fitScore > after.fitScore) {
      tailoredResume = keywordBooster;
      after = boosted;
      boostWarning = "Added a target-keywords block to improve ATS alignment for this JD.";
    }
  }

  const truthWarnings = [
    ...generated.warnings,
    ...detectTruthWarnings(resumeText, tailoredResume, before.missingKeywords),
    ...(boostWarning ? [boostWarning] : [])
  ];

  return ok({
    mode: "jd_tailor",
    job: {
      title: job.title,
      company: job.company,
      experienceLevel: job.experienceLevel,
      remoteType: job.remoteType
    },
    resumeAts,
    scoring: {
      originalAtsScore: before.fitScore,
      tailoredAtsScore: after.fitScore,
      scoreLift: after.fitScore - before.fitScore,
      keywordGapBefore: before.missingKeywords,
      keywordGapAfter: after.missingKeywords,
      reasonsBefore: before.reasons,
      reasonsAfter: after.reasons
    },
    recommendation: {
      tailoredResume,
      tailoredCoverLetter: generated.tailoredCoverLetter,
      truthGuardWarnings: truthWarnings
    }
  });
}
