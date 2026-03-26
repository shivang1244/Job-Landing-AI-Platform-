import { computeFitScore, extractTopKeywords, extractYearsOfExperience, parseResumeText } from "@/lib/matching";
import { extractResumeStructure } from "@/lib/resume-structure";
import { ExperienceLevel, JobPosting } from "@/lib/types";

type BreakdownItem = {
  label: string;
  score: number;
  max: number;
  detail: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toPoints(condition: boolean, points: number) {
  return condition ? points : 0;
}

function inferRemoteType(jobDescription: string): JobPosting["remoteType"] {
  const normalized = jobDescription.toLowerCase();
  if (/\bhybrid\b/.test(normalized)) {
    return "hybrid";
  }
  if (/\bonsite\b|\bon-site\b|\bin office\b|\bon campus\b/.test(normalized)) {
    return "onsite";
  }
  return "remote";
}

function inferLevelFromJD(jobDescription: string): ExperienceLevel {
  const normalized = jobDescription.toLowerCase();
  const explicitYears = [...normalized.matchAll(/(\d{1,2})\s*\+?\s*(?:years?|yrs?)/g)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value));
  const maxYears = explicitYears.length > 0 ? Math.max(...explicitYears) : 0;

  if (/\b(intern|entry|fresher|junior|graduate)\b/.test(normalized) || maxYears <= 1) {
    return "level0";
  }
  if (/\b(senior|staff|lead|principal)\b/.test(normalized) || maxYears >= 5) {
    return "level2";
  }
  return "level1";
}

function inferJobTitle(jobDescription: string): string {
  const firstLine = jobDescription
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return "Target Role";
  }

  return firstLine.length > 80 ? "Target Role" : firstLine;
}

export function buildCustomJobFromJD(input: {
  jobDescription: string;
  jobTitle?: string;
  company?: string;
}): JobPosting {
  return {
    id: "custom-job",
    source: "custom-jd",
    title: input.jobTitle?.trim() || inferJobTitle(input.jobDescription),
    company: input.company?.trim() || "Target Company",
    country: "Global",
    location: "Custom JD",
    remoteType: inferRemoteType(input.jobDescription),
    postedAt: new Date().toISOString(),
    applyUrl: "https://example.com/job",
    companySite: "https://example.com",
    publicRecruiterProfiles: [],
    experienceLevel: inferLevelFromJD(input.jobDescription),
    description: input.jobDescription,
    risk: "low"
  };
}

export function detectTruthWarnings(resumeText: string, tailoredResume: string, keywords: string[]) {
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

  return warnings.slice(0, 12);
}

export function computeResumeAtsReadiness(resumeText: string) {
  const parsed = parseResumeText(resumeText);
  const structure = extractResumeStructure(resumeText);
  const lines = resumeText.split(/\r?\n/).map((line) => line.trim());
  const normalized = resumeText.toLowerCase();

  const emailDetected = /\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i.test(resumeText);
  const phoneDetected = /\+?\d[\d\s()-]{7,}\d/.test(resumeText);
  const profileDetected = /(linkedin\.com|github\.com|portfolio|behance|dribbble)/i.test(resumeText);

  const expectedHeadings = ["summary", "experience", "projects", "skills", "education"];
  const headingHits = structure.sections.filter((section) =>
    expectedHeadings.some((expected) => section.heading.toLowerCase().includes(expected))
  ).length;

  const bulletLineCount = lines.filter((line) => /^[-*•]/.test(line)).length;
  const metricBulletCount = lines.filter(
    (line) => /^[-*•]/.test(line) && /(\d+%|\b\d+\+?\b|\b\d+(\.\d+)?x\b|\breduced\b|\bincreased\b)/i.test(line)
  ).length;

  const keywordRichness = extractTopKeywords(resumeText, 25).length;
  const longLines = lines.filter((line) => line.length > 140).length;
  const charLength = resumeText.replace(/\s+/g, " ").trim().length;

  const contactScore = clamp(
    toPoints(emailDetected, 7) + toPoints(phoneDetected, 6) + toPoints(profileDetected, 5),
    0,
    18
  );
  const sectionScore = clamp(Math.round((headingHits / expectedHeadings.length) * 22), 6, 22);
  const skillScore = clamp(Math.round((Math.min(parsed.parsedSkills.length, 14) / 14) * 18), 4, 18);
  const impactScore = clamp(
    Math.round(Math.min(1, bulletLineCount / 12) * 10 + Math.min(1, metricBulletCount / 8) * 12),
    0,
    22
  );

  const lengthBalance =
    charLength >= 900 && charLength <= 7000 ? 12 : charLength < 900 ? 5 : Math.max(4, 12 - (charLength - 7000) / 1200);
  const formattingScore = clamp(Math.round(lengthBalance - longLines * 0.8), 0, 20);

  const totalScore = clamp(
    Math.round(contactScore + sectionScore + skillScore + impactScore + formattingScore),
    0,
    100
  );

  const breakdown: BreakdownItem[] = [
    {
      label: "Contact and profile signals",
      score: contactScore,
      max: 18,
      detail: "Email, phone, and professional links improve ATS parsing confidence."
    },
    {
      label: "Section structure",
      score: sectionScore,
      max: 22,
      detail: "Clear headings like Summary, Experience, Projects, Skills, and Education."
    },
    {
      label: "Skill coverage",
      score: skillScore,
      max: 18,
      detail: "Relevant technical skills and domain keywords surfaced from the resume."
    },
    {
      label: "Impact-focused bullets",
      score: impactScore,
      max: 22,
      detail: "Bullets with quantifiable outcomes tend to rank better in ATS and recruiter scans."
    },
    {
      label: "Formatting hygiene",
      score: formattingScore,
      max: 20,
      detail: "Balanced length, readable line size, and cleaner text structure."
    }
  ];

  const recommendations: string[] = [];
  if (!emailDetected || !phoneDetected) {
    recommendations.push("Add clear contact information at the top (email and phone).");
  }
  if (headingHits < 4) {
    recommendations.push("Use explicit section headings: Summary, Experience, Projects, Skills, Education.");
  }
  if (metricBulletCount < 4) {
    recommendations.push("Add measurable outcomes in bullet points (for example %, x, or numeric impact).");
  }
  if (parsed.parsedSkills.length < 8) {
    recommendations.push("Expand skills with tools and frameworks that match your target roles.");
  }
  if (longLines > 6) {
    recommendations.push("Break long paragraphs into shorter bullets to improve ATS readability.");
  }
  if (!/pdf|docx|doc|txt/.test(normalized)) {
    recommendations.push("Export in ATS-friendly format (PDF or DOCX) with simple, single-column layout.");
  }

  return {
    score: totalScore,
    breakdown,
    recommendations: recommendations.slice(0, 6),
    signals: {
      parsedSkills: parsed.parsedSkills,
      parsedRoles: parsed.parsedRoles,
      parsedYears: parsed.parsedYears,
      topKeywords: extractTopKeywords(resumeText, 12)
    }
  };
}

export function scoreAgainstJD(resumeText: string, job: JobPosting, resumeLevel: ExperienceLevel) {
  return computeFitScore(resumeText, job, resumeLevel);
}
