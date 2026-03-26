import { NextRequest } from "next/server";
import { createId, nowIso, readDb, writeDb } from "@/lib/data-store";
import { badRequest, ok } from "@/lib/http";
import { getUserId } from "@/lib/logic";
import { parseResumeText } from "@/lib/matching";
import { extractResumeText } from "@/lib/resume-parser";

export const runtime = "nodejs";

type UploadPayload = {
  userId: string;
  fileName: string;
  resumeText: string;
};

async function parseRequest(request: NextRequest): Promise<UploadPayload> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const userId = getUserId(form.get("userId"));
    const textField = (form.get("resumeText")?.toString() ?? "").trim();
    const file = form.get("file");

    if (file && file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const extracted = (await extractResumeText(file.name, buffer)).trim();
      if (!extracted) {
        throw new Error("Could not extract text from uploaded file. Please re-upload or paste resume text manually.");
      }

      return {
        userId,
        fileName: file.name,
        resumeText: extracted
      };
    }

    return {
      userId,
      fileName: (form.get("fileName")?.toString() ?? "resume.txt").trim() || "resume.txt",
      resumeText: textField
    };
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body.");
  }

  return {
    userId: getUserId((body as { userId?: string }).userId),
    fileName: (body as { fileName?: string }).fileName?.trim() || "resume.txt",
    resumeText: (body as { resumeText?: string }).resumeText?.trim() || ""
  };
}

export async function POST(request: NextRequest) {
  let payload: UploadPayload;

  try {
    payload = await parseRequest(request);
  } catch (error) {
    return badRequest((error as Error).message || "Invalid request payload.");
  }

  if (!payload.resumeText) {
    return badRequest("Resume text could not be extracted. Upload TXT/PDF/DOCX or paste resume text.");
  }

  const parsed = parseResumeText(payload.resumeText);
  const resume = {
    id: createId("resume"),
    userId: payload.userId,
    fileName: payload.fileName,
    rawText: payload.resumeText,
    parsedSkills: parsed.parsedSkills,
    parsedRoles: parsed.parsedRoles,
    parsedLocations: parsed.parsedLocations,
    parsedYears: parsed.parsedYears,
    experienceLevel: parsed.experienceLevel,
    experienceLabel: parsed.experienceLabel,
    createdAt: nowIso()
  };

  const db = readDb();
  const userResumeIds = new Set(db.resumes.filter((item) => item.userId === payload.userId).map((item) => item.id));

  // Keep runtime behavior fresh per upload by removing previous user state.
  db.resumes = db.resumes.filter((item) => item.userId !== payload.userId);
  db.matches = db.matches.filter((item) => item.userId !== payload.userId && !userResumeIds.has(item.resumeId));
  db.recommendations = db.recommendations.filter(
    (item) => item.userId !== payload.userId && !userResumeIds.has(item.resumeId)
  );
  const removedVariantIds = new Set(
    db.resumeVariants
      .filter((item) => item.userId === payload.userId || userResumeIds.has(item.resumeId))
      .map((item) => item.id)
  );
  db.resumeVariants = db.resumeVariants.filter(
    (item) => item.userId !== payload.userId && !userResumeIds.has(item.resumeId)
  );
  db.resumeExperiments = db.resumeExperiments.filter(
    (item) => item.userId !== payload.userId && !removedVariantIds.has(item.resumeVariantId)
  );
  db.applications = db.applications.filter((item) => item.userId !== payload.userId);
  db.followUps = db.followUps.filter((item) => item.userId !== payload.userId);
  db.referrals = db.referrals.filter((item) => item.userId !== payload.userId);
  db.interviewPacks = db.interviewPacks.filter((item) => item.userId !== payload.userId);
  db.truthGuardResults = db.truthGuardResults.filter((item) => item.userId !== payload.userId);
  db.skillGapPlans = db.skillGapPlans.filter((item) => item.userId !== payload.userId);
  db.portfolioRecommendations = db.portfolioRecommendations.filter((item) => item.userId !== payload.userId);
  db.applyTimeRecommendations = db.applyTimeRecommendations.filter((item) => item.userId !== payload.userId);
  db.outreachThreads = db.outreachThreads.filter((item) => item.userId !== payload.userId);

  db.resumes.push(resume);
  writeDb(db);

  return ok({
    resume,
    extractedText: payload.resumeText,
    suggestedDomain: parsed.domainHints.slice(0, 4).join(" ")
  });
}
