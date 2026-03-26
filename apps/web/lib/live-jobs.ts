import { JobPosting, ExperienceLevel } from "@/lib/types";
import { tokenize } from "@/lib/matching";

type LiveSearchInput = {
  domain: string;
  country: string;
  location: string;
  experienceLevel: ExperienceLevel;
  postingWindowDays: number;
  limit?: number;
};

type RemotiveResponse = {
  jobs?: Array<{
    id: number;
    url: string;
    title: string;
    company_name: string;
    category?: string;
    job_type?: string;
    publication_date?: string;
    candidate_required_location?: string;
    salary?: string;
    description?: string;
  }>;
};

type RemoteOkJob = {
  id?: number;
  slug?: string;
  position?: string;
  company?: string;
  tags?: string[];
  description?: string;
  url?: string;
  date?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
};

function liveId(prefix: string, value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) >>> 0;
  }

  return `${prefix}_${hash.toString(36)}`;
}

function detectExperienceLevel(title: string, description: string, fallback: ExperienceLevel): ExperienceLevel {
  const normalized = `${title} ${description}`.toLowerCase();

  if (/(intern|internship|graduate|entry level|entry-level|junior|associate|fresher)/i.test(normalized)) {
    return "level0";
  }

  if (/(senior|staff|lead|principal|manager|architect)/i.test(normalized)) {
    return "level2";
  }

  if (/(engineer|scientist|developer|analyst|specialist)/i.test(normalized)) {
    return "level1";
  }

  return fallback;
}

function inferCountry(locationText: string, fallbackCountry: string): string {
  const normalized = locationText.toLowerCase();

  if (normalized.includes("india")) {
    return "India";
  }

  if (normalized.includes("worldwide") || normalized.includes("global")) {
    return "Global";
  }

  return fallbackCountry || "Global";
}

function inferRemoteType(locationText: string): "remote" | "hybrid" | "onsite" {
  const normalized = locationText.toLowerCase();

  if (normalized.includes("hybrid")) {
    return "hybrid";
  }

  if (normalized.includes("remote") || normalized.includes("worldwide") || normalized.includes("global")) {
    return "remote";
  }

  return "onsite";
}

function withinPostingWindow(postedAt: string, postingWindowDays: number): boolean {
  const posted = new Date(postedAt).getTime();
  if (Number.isNaN(posted)) {
    return false;
  }

  return Date.now() - posted <= postingWindowDays * 24 * 60 * 60 * 1000;
}

function matchesSearch(title: string, description: string, tags: string[], queryTokens: string[]): boolean {
  if (queryTokens.length === 0) {
    return true;
  }

  const haystack = new Set(tokenize(`${title} ${description} ${tags.join(" ")}`));
  return queryTokens.some((token) => haystack.has(token));
}

function matchesLevel(jobLevel: ExperienceLevel, targetLevel: ExperienceLevel): boolean {
  const weight = (level: ExperienceLevel) => (level === "level0" ? 0 : level === "level1" ? 1 : 2);
  return Math.abs(weight(jobLevel) - weight(targetLevel)) <= 1;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "job-landing-platform/0.1"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function fetchRemotiveJobs(input: LiveSearchInput): Promise<JobPosting[]> {
  const query = encodeURIComponent(input.domain || "machine learning");
  const data = await fetchJson<RemotiveResponse>(`https://remotive.com/api/remote-jobs?limit=40&search=${query}`);
  const jobs = data?.jobs ?? [];

  return jobs
    .filter((job) => withinPostingWindow(job.publication_date ?? "", input.postingWindowDays))
    .map((job) => {
      const locationText = job.candidate_required_location || "Worldwide";
      const country = inferCountry(locationText, input.country);
      const description = job.description ?? "";
      const experienceLevel = detectExperienceLevel(job.title, description, input.experienceLevel);

      return {
        id: liveId("remotive", String(job.id ?? job.url)),
        source: "remotive",
        title: job.title,
        company: job.company_name,
        country,
        location: locationText,
        remoteType: inferRemoteType(locationText),
        postedAt: new Date(job.publication_date ?? Date.now()).toISOString(),
        applyUrl: job.url,
        companySite: job.url,
        publicRecruiterProfiles: [],
        salary: job.salary,
        visaSponsorship: "unknown",
        experienceLevel,
        description,
        risk: "low"
      } satisfies JobPosting;
    })
    .filter((job) => matchesLevel(job.experienceLevel, input.experienceLevel))
    .filter((job) => matchesSearch(job.title, job.description, tokenize(job.description), tokenize(input.domain)))
    .slice(0, input.limit ?? 20);
}

async function fetchRemoteOkJobs(input: LiveSearchInput): Promise<JobPosting[]> {
  const data = await fetchJson<Array<Record<string, unknown>>>("https://remoteok.com/api");
  const jobs = (data ?? [])
    .filter((item): item is RemoteOkJob => typeof item === "object" && item !== null && "position" in item);

  return jobs
    .map((job) => {
      const title = job.position ?? "";
      const description = job.description ?? "";
      const locationText = job.location ?? "Remote";
      const tags = Array.isArray(job.tags) ? job.tags.map(String) : [];
      const experienceLevel = detectExperienceLevel(title, `${description} ${tags.join(" ")}`, input.experienceLevel);
      const applyUrl = job.url || (job.slug ? `https://remoteok.com/remote-jobs/${job.slug}` : "https://remoteok.com");
      const salary =
        typeof job.salary_min === "number" || typeof job.salary_max === "number"
          ? `$${job.salary_min ?? "?"} - $${job.salary_max ?? "?"}`
          : undefined;

      return {
        id: liveId("remoteok", String(job.id ?? applyUrl)),
        source: "remoteok",
        title,
        company: job.company ?? "Remote Company",
        country: inferCountry(locationText, input.country),
        location: locationText,
        remoteType: inferRemoteType(locationText),
        postedAt: new Date(job.date ?? Date.now()).toISOString(),
        applyUrl,
        companySite: applyUrl,
        publicRecruiterProfiles: [],
        salary,
        visaSponsorship: "unknown",
        experienceLevel,
        description: `${description} Tags: ${tags.join(", ")}`,
        risk: "low"
      } satisfies JobPosting;
    })
    .filter((job) => withinPostingWindow(job.postedAt, input.postingWindowDays))
    .filter((job) => matchesLevel(job.experienceLevel, input.experienceLevel))
    .filter((job) => matchesSearch(job.title, job.description, tokenize(job.description), tokenize(input.domain)))
    .slice(0, input.limit ?? 20);
}

export async function fetchLiveJobs(input: LiveSearchInput): Promise<JobPosting[]> {
  const [remotiveJobs, remoteOkJobs] = await Promise.all([
    fetchRemotiveJobs({ ...input, limit: Math.ceil((input.limit ?? 30) / 2) }),
    fetchRemoteOkJobs({ ...input, limit: Math.ceil((input.limit ?? 30) / 2) })
  ]);

  const seen = new Set<string>();
  const merged: JobPosting[] = [];

  for (const job of [...remotiveJobs, ...remoteOkJobs]) {
    const key = `${job.source}:${job.applyUrl}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(job);
  }

  return merged;
}
