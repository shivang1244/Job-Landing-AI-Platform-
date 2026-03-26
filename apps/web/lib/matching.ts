import { ExperienceLabel, ExperienceLevel, JobPosting } from "@/lib/types";

const STOPWORDS = new Set([
  "a",
  "an",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "to",
  "via",
  "was",
  "were",
  "while",
  "within",
  "across",
  "about",
  "after",
  "before",
  "during",
  "through",
  "over",
  "under",
  "the",
  "and",
  "with",
  "that",
  "this",
  "have",
  "will",
  "your",
  "our",
  "you",
  "are",
  "not",
  "can",
  "all",
  "any",
  "years",
  "year",
  "experience",
  "using",
  "used",
  "work",
  "worked",
  "professional",
  "summary",
  "technical",
  "skills",
  "soft",
  "tools",
  "framework",
  "frameworks",
  "project",
  "projects",
  "education",
  "certifications",
  "certification",
  "present",
  "resume",
  "phone",
  "email",
  "portfolio",
  "linkedin",
  "github",
  "curriculum",
  "vitae",
  "profile",
  "objective",
  "responsibilities",
  "responsibility",
  "achievement",
  "achievements",
  "based"
]);

const SKILL_TAXONOMY: Record<string, string[]> = {
  "artificial intelligence": ["artificial intelligence", "ai", "intelligent systems"],
  "machine learning": ["machine learning", "ml", "scikit-learn"],
  "deep learning": ["deep learning", "tensorflow", "pytorch", "keras", "neural"],
  "generative ai": ["generative ai", "genai", "gpt", "llm", "rag", "prompt engineering"],
  "natural language processing": ["nlp", "transformers", "summarization", "text processing", "bert", "flan-t5"],
  "computer vision": ["computer vision", "opencv", "yolov5", "image detection", "object detection", "video"],
  "data science": ["data science", "analytics", "statistics", "sql", "power bi", "tableau"],
  "mlops": ["mlops", "deployment", "monitoring", "docker", "kubernetes", "pipeline", "pipelines"],
  "software engineering": ["software engineer", "software engineering", "sde", "system design", "oop", "dsa"],
  "backend engineering": ["backend", "node.js", "nodejs", "express", "java spring", "spring boot", "rest api", "microservices"],
  "frontend engineering": ["frontend", "react", "next.js", "nextjs", "javascript", "typescript", "html", "css"],
  "full stack development": ["full stack", "fullstack", "mern", "mean", "web development"],
  "cloud": ["aws", "azure", "gcp", "cloud", "serverless"],
  "devops": ["devops", "ci/cd", "github actions", "jenkins", "terraform"],
  "python": ["python"],
  "java": ["java"],
  "sql": ["sql"]
};

const ROLE_PATTERNS = [
  "ai/ml engineer",
  "generative ai developer",
  "machine learning engineer",
  "ai engineer",
  "data scientist",
  "data analyst",
  "nlp engineer",
  "mlops engineer",
  "ai intern",
  "generative ai intern",
  "associate data scientist",
  "software engineer",
  "backend engineer",
  "frontend engineer",
  "full stack developer",
  "fullstack developer",
  "web developer",
  "application developer",
  "sde"
];

const LOCATION_HINTS = [
  "india",
  "usa",
  "united states",
  "remote",
  "hybrid",
  "onsite",
  "europe",
  "canada",
  "singapore",
  "bangalore",
  "bengaluru",
  "pune",
  "delhi",
  "mumbai",
  "hyderabad",
  "chennai",
  "nagpur"
];

function sanitizeResumeText(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, " ")
    .replace(/\+?\d[\d\s()-]{7,}\d/g, " ")
    .replace(/[|/]/g, " ")
    .replace(/[^\w\s.+#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text: string): string[] {
  return sanitizeResumeText(text)
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => {
      if (!token || token.length < 2) {
        return false;
      }

      if (STOPWORDS.has(token)) {
        return false;
      }

      if (/^\d+$/.test(token)) {
        return false;
      }

      if (token.includes("www") || token.includes(".com")) {
        return false;
      }

      return true;
    });
}

export function extractTopKeywords(text: string, limit = 25): string[] {
  const frequency = new Map<string, number>();

  for (const token of tokenize(text)) {
    frequency.set(token, (frequency.get(token) ?? 0) + 1);
  }

  return [...frequency.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([token]) => token);
}

export function extractYearsOfExperience(rawText: string): number {
  const explicitMatches = [...rawText.matchAll(/(\d{1,2})\s*\+?\s*(?:years?|yrs?)\s*(?:of)?\s*experience/gi)];
  const explicitValues = explicitMatches
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value >= 0);

  if (explicitValues.length > 0) {
    return Math.max(...explicitValues);
  }

  const internshipMatches = [...rawText.matchAll(/\b(?:intern|internship)\b/gi)].length;
  return internshipMatches > 0 ? 0 : 0;
}

export function toExperienceLevel(years: number, rawText: string): ExperienceLevel {
  const normalized = rawText.toLowerCase();
  const fresherHints = /(fresher|entry level|student|undergrad|graduate|intern)/i.test(normalized);

  if (years <= 1 && fresherHints) {
    return "level0";
  }

  if (years <= 1) {
    return "level0";
  }

  if (years <= 4) {
    return "level1";
  }

  return "level2";
}

export function toExperienceLabel(level: ExperienceLevel): ExperienceLabel {
  if (level === "level0") {
    return "fresher";
  }

  if (level === "level1") {
    return "experienced";
  }

  return "senior";
}

function detectSkills(rawText: string): string[] {
  const normalized = sanitizeResumeText(rawText).toLowerCase();
  const tokenSet = new Set(tokenize(rawText));
  const matched: string[] = [];

  for (const [skill, aliases] of Object.entries(SKILL_TAXONOMY)) {
    const hasAlias = aliases.some((alias) => {
      const aliasLower = alias.toLowerCase().trim();
      const aliasTokens = tokenize(aliasLower);

      // For short aliases like "ai"/"ml", require exact token match to avoid false positives
      // from words like "maintain" or "html".
      if (aliasTokens.length === 1 && aliasTokens[0].length <= 3) {
        return tokenSet.has(aliasTokens[0]);
      }

      if (aliasTokens.length === 1) {
        return normalized.includes(aliasLower);
      }

      return aliasTokens.every((token) => tokenSet.has(token));
    });

    if (hasAlias) {
      matched.push(skill);
    }
  }

  const fallbackTokens = extractTopKeywords(rawText, 20).filter(
    (token) => !matched.includes(token) && !token.includes("202") && token.length > 2
  );

  return [...matched, ...fallbackTokens].slice(0, 16);
}

function detectRoles(lines: string[]): string[] {
  const found = new Set<string>();

  for (const line of lines) {
    const normalized = line.toLowerCase();
    for (const pattern of ROLE_PATTERNS) {
      if (normalized.includes(pattern)) {
        found.add(pattern.replace(/\b\w/g, (char) => char.toUpperCase()));
      }
    }
  }

  return [...found].slice(0, 8);
}

function detectLocations(lines: string[]): string[] {
  const found = new Set<string>();

  for (const line of lines) {
    const normalized = line.toLowerCase();
    for (const location of LOCATION_HINTS) {
      if (normalized.includes(location)) {
        found.add(location.replace(/\b\w/g, (char) => char.toUpperCase()));
      }
    }
  }

  return [...found].slice(0, 6);
}

function detectDomainHints(skills: string[]): string[] {
  const hasAIDomain = skills.some((skill) =>
    [
      "generative ai",
      "machine learning",
      "artificial intelligence",
      "natural language processing",
      "computer vision",
      "mlops",
      "data science"
    ].includes(skill)
  );
  const hasSoftwareDomain = skills.some((skill) =>
    [
      "software engineering",
      "backend engineering",
      "frontend engineering",
      "full stack development",
      "cloud",
      "devops"
    ].includes(skill)
  );

  const preferredOrder = [
    ...(hasSoftwareDomain
      ? ["software engineering", "backend engineering", "frontend engineering", "full stack development", "cloud", "devops"]
      : []),
    "generative ai",
    "machine learning",
    "artificial intelligence",
    "natural language processing",
    "computer vision",
    "mlops",
    "data science",
    ...(hasAIDomain || hasSoftwareDomain ? [] : ["python", "java", "sql"])
  ];

  const matched = preferredOrder.filter((item) => skills.includes(item)).slice(0, 5);
  if (matched.length > 0) {
    return matched;
  }

  return skills.slice(0, 4);
}

export function parseResumeText(rawText: string) {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const parsedSkills = detectSkills(rawText);
  const parsedRoles = detectRoles(lines);
  const parsedLocations = detectLocations(lines);
  const parsedYears = extractYearsOfExperience(rawText);
  const experienceLevel = toExperienceLevel(parsedYears, rawText);
  const experienceLabel = toExperienceLabel(experienceLevel);
  const domainHints = detectDomainHints(parsedSkills);

  return {
    parsedSkills,
    parsedRoles,
    parsedLocations,
    parsedYears,
    experienceLevel,
    experienceLabel,
    domainHints
  };
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

function postingFreshnessBoost(postedAt: string): number {
  const ageHours = hoursAgo(postedAt);

  if (ageHours <= 1) {
    return 8;
  }

  if (ageHours <= 24) {
    return 5;
  }

  if (ageHours <= 72) {
    return 3;
  }

  if (ageHours <= 168) {
    return 1;
  }

  return 0;
}

export function computeFitScore(
  resumeText: string,
  job: JobPosting,
  resumeLevel: ExperienceLevel = "level1"
) {
  const resumeTokens = new Set(tokenize(resumeText));
  const resumeSkills = new Set(parseResumeText(resumeText).parsedSkills);
  const jobCompositeText = `${job.title} ${job.description} ${job.company} ${job.location} ${job.remoteType}`;
  const jobKeywords = extractTopKeywords(jobCompositeText, 24);
  const jobSkills = detectSkills(jobCompositeText);

  const matched = jobKeywords.filter((keyword) => resumeTokens.has(keyword));
  const missing = jobKeywords.filter((keyword) => !resumeTokens.has(keyword));
  const matchedSkills = jobSkills.filter((skill) => resumeSkills.has(skill));
  const titleBonus = tokenize(job.title).filter((token) => resumeTokens.has(token)).length * 6;

  const keywordScore = jobKeywords.length ? (matched.length / jobKeywords.length) * 58 : 18;
  const skillScore = jobSkills.length ? (matchedSkills.length / jobSkills.length) * 30 : 12;
  const base = keywordScore + skillScore + titleBonus;
  const recencyBoost = postingFreshnessBoost(job.postedAt);
  const riskPenalty = job.risk === "high" ? 20 : job.risk === "medium" ? 8 : 0;
  const levelPenalty = Math.abs(levelWeight(resumeLevel) - levelWeight(job.experienceLevel)) * 8;

  const fitScore = Math.max(0, Math.min(100, Math.round(base + recencyBoost - riskPenalty - levelPenalty)));

  const reasons = [
    `${matched.length} keyword matches and ${matchedSkills.length} skill matches`,
    job.remoteType === "remote" ? "Role supports remote work" : `Role is ${job.remoteType}`,
    `Posted ${Math.max(1, Math.floor(hoursAgo(job.postedAt)))} hour(s) ago`,
    `Role level: ${job.experienceLevel} | Profile level: ${resumeLevel}`
  ];

  return {
    fitScore,
    reasons,
    missingKeywords: missing.slice(0, 12)
  };
}

function hoursAgo(isoDate: string): number {
  const then = new Date(isoDate).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - then) / (1000 * 60 * 60)));
}

export function isRecentWithinDays(isoDate: string, days: number): boolean {
  return hoursAgo(isoDate) <= days * 24;
}

export function isRecentWithinHours(isoDate: string, hours: number): boolean {
  return hoursAgo(isoDate) <= hours;
}

export function experienceLabel(level: ExperienceLevel): string {
  if (level === "level0") {
    return "Fresher (Level 0)";
  }

  if (level === "level1") {
    return "Experienced (Level 1)";
  }

  return "Senior (Level 2)";
}
