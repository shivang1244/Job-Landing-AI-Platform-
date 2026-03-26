type ResumeSection = {
  heading: string;
  lines: string[];
};

const KNOWN_HEADINGS = [
  "professional summary",
  "summary",
  "experience",
  "work experience",
  "internship experience",
  "projects",
  "education",
  "skills",
  "technical skills",
  "certifications",
  "achievements",
  "leadership",
  "activities"
];

function normalizeHeading(line: string): string {
  return line
    .trim()
    .toLowerCase()
    .replace(/[:\-]+$/g, "")
    .replace(/\s+/g, " ");
}

function looksLikeHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }

  const normalized = normalizeHeading(trimmed);
  if (KNOWN_HEADINGS.includes(normalized)) {
    return true;
  }

  if (trimmed.length <= 40 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
    return true;
  }

  return false;
}

export function extractResumeStructure(rawText: string) {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  const headerLines: string[] = [];
  const sections: ResumeSection[] = [];
  let currentSection: ResumeSection | null = null;

  for (const line of lines) {
    if (looksLikeHeading(line)) {
      currentSection = {
        heading: line.trim(),
        lines: []
      };
      sections.push(currentSection);
      continue;
    }

    if (!currentSection) {
      headerLines.push(line);
      continue;
    }

    currentSection.lines.push(line);
  }

  return {
    headerLines: headerLines.slice(0, 10),
    sections
  };
}

export function buildFallbackTailoredResume(
  rawText: string,
  jobTitle: string,
  company: string,
  keywords: string[]
) {
  const structure = extractResumeStructure(rawText);
  const header = structure.headerLines.join("\n");
  const sections = structure.sections.map((section) => {
    if (normalizeHeading(section.heading).includes("summary")) {
      return `${section.heading}\n${section.lines.join("\n")}\nTarget Role Alignment: ${jobTitle} at ${company}\nATS Focus: ${keywords
        .slice(0, 6)
        .join(", ")}`;
    }

    if (normalizeHeading(section.heading).includes("skills")) {
      return `${section.heading}\n${section.lines.join("\n")}\nPriority ATS Keywords: ${keywords.slice(0, 10).join(" | ")}`;
    }

    return `${section.heading}\n${section.lines.join("\n")}`;
  });

  return [header, ...sections].filter(Boolean).join("\n\n");
}
