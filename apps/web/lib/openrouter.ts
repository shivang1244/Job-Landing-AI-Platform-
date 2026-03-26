import { ExperienceLabel } from "@/lib/types";
import { buildFallbackTailoredResume, extractResumeStructure } from "@/lib/resume-structure";

const DEFAULT_MODEL = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";

interface CompletionResult {
  content: string;
}

export async function askModel(systemPrompt: string, userPrompt: string): Promise<CompletionResult | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "job-landing-platform"
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      return null;
    }

    const json = await response.json();
    const content: string | undefined = json?.choices?.[0]?.message?.content;

    if (!content) {
      return null;
    }

    return { content };
  } catch {
    return null;
  }
}

function tryParseModelJson(raw: string): {
  tailoredResume?: string;
  tailoredCoverLetter?: string;
  warnings?: string[];
} | null {
  const direct = raw.trim();
  const candidates = [direct];

  const fencedMatch = direct.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    candidates.push(fencedMatch[1].trim());
  }

  const firstBrace = direct.indexOf("{");
  const lastBrace = direct.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(direct.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as {
        tailoredResume?: string;
        tailoredCoverLetter?: string;
        warnings?: string[];
      };
      return parsed;
    } catch {
      continue;
    }
  }

  return null;
}

function maxYearsMentioned(text: string): number {
  const matches = [...text.matchAll(/(\d{1,2})\s*\+?\s*(?:years?|yrs?)\s*(?:of)?\s*experience/gi)];
  const values = matches.map((match) => Number(match[1])).filter((value) => Number.isFinite(value));
  return values.length ? Math.max(...values) : 0;
}

function sanitizeYearsClaim(
  generatedResume: string,
  generatedCoverLetter: string,
  resumeYears: number,
  experienceLabel: ExperienceLabel
) {
  const generatedYears = maxYearsMentioned(`${generatedResume}\n${generatedCoverLetter}`);

  if (generatedYears <= resumeYears) {
    return {
      tailoredResume: generatedResume,
      tailoredCoverLetter: generatedCoverLetter,
      warnings: [] as string[]
    };
  }

  const replacement =
    experienceLabel === "fresher"
      ? "entry-level hands-on project experience"
      : `${Math.max(1, resumeYears)} year(s) of relevant experience`;

  const replacedResume = generatedResume.replace(
    /(\d{1,2}\s*\+?\s*(?:years?|yrs?)\s*(?:of)?\s*experience)/gi,
    replacement
  );

  const replacedLetter = generatedCoverLetter.replace(
    /(\d{1,2}\s*\+?\s*(?:years?|yrs?)\s*(?:of)?\s*experience)/gi,
    replacement
  );

  return {
    tailoredResume: replacedResume,
    tailoredCoverLetter: replacedLetter,
    warnings: [
      `Adjusted experience claims because generated text mentioned ${generatedYears} year(s), but resume evidence is ${resumeYears}.`
    ]
  };
}

export async function generateAtsArtifacts(input: {
  resumeText: string;
  resumeYears: number;
  experienceLabel: ExperienceLabel;
  jobTitle: string;
  company: string;
  jobDescription: string;
  keywordGap: string[];
}) {
  const structure = extractResumeStructure(input.resumeText);
  const sectionOrder = structure.sections.map((section) => section.heading).join(" | ");

  const fallbackResume = [
    buildFallbackTailoredResume(input.resumeText, input.jobTitle, input.company, input.keywordGap)
  ].join("\n");

  const fallbackCoverLetter = [
    `Dear Hiring Team at ${input.company},`,
    "",
    `I am excited to apply for the ${input.jobTitle} role. My resume and project work align with the role requirements, and I am ready to contribute quickly.`,
    "",
    "I have focused on practical execution, strong ownership, and collaborative delivery.",
    "",
    "Thank you for your time and consideration.",
    "",
    "Sincerely,",
    "Candidate"
  ].join("\n");

  const completion = await askModel(
    "You are an ATS optimization assistant. Respond ONLY valid JSON with keys: tailoredResume (string), tailoredCoverLetter (string), warnings (string[]). Never invent years of experience, fake employers, fake certifications, or fake projects. Preserve the source resume structure, section order, contact block, and project/experience evidence. Rewrite bullets only when supported by source evidence.",
    `Resume:\n${input.resumeText}\n\nResume Experience Evidence (years): ${input.resumeYears}\nExperience category: ${input.experienceLabel}\nOriginal Section Order: ${sectionOrder || "No explicit headings detected"}\nJob Title: ${input.jobTitle}\nCompany: ${input.company}\nJob Description:\n${input.jobDescription}\n\nMissing Keywords:\n${input.keywordGap.join(", ")}\n\nWrite a tailored resume copy in the same structure as the original resume and a strong professional cover letter.`
  );

  if (!completion) {
    return {
      tailoredResume: fallbackResume,
      tailoredCoverLetter: fallbackCoverLetter,
      warnings: ["Model unavailable, generated deterministic fallback content."]
    };
  }

  try {
    const parsed = tryParseModelJson(completion.content);
    if (!parsed) {
      throw new Error("Model response was not valid JSON.");
    }

    const rawResume = parsed.tailoredResume ?? fallbackResume;
    const rawCoverLetter = parsed.tailoredCoverLetter ?? fallbackCoverLetter;

    const sanitized = sanitizeYearsClaim(rawResume, rawCoverLetter, input.resumeYears, input.experienceLabel);

    return {
      tailoredResume: sanitized.tailoredResume,
      tailoredCoverLetter: sanitized.tailoredCoverLetter,
      warnings: [...(parsed.warnings ?? []), ...sanitized.warnings]
    };
  } catch {
    return {
      tailoredResume: fallbackResume,
      tailoredCoverLetter: fallbackCoverLetter,
      warnings: ["Model output was non-JSON, fallback content used."]
    };
  }
}
