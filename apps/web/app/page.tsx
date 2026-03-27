"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";

type ExperienceLevel = "level0" | "level1" | "level2";
type ExperiencePreference = "auto" | ExperienceLevel;
type PostingWindow = "1h" | "3d" | "7d" | "15d";

type JobRow = {
  id: string;
  title: string;
  company: string;
  companySite: string;
  country: string;
  location: string;
  remoteType: "remote" | "hybrid" | "onsite";
  postedAt: string;
  applyUrl: string;
  companyContactEmail?: string;
  publicRecruiterProfiles?: string[];
  risk: "low" | "medium" | "high";
  experienceLevel: ExperienceLevel;
  fitScore: number;
  reasons: string[];
  missingKeywords: string[];
};

type Resume = {
  id: string;
  fileName: string;
  parsedSkills: string[];
  parsedRoles: string[];
  parsedYears: number;
  experienceLevel: ExperienceLevel;
  experienceLabel: "fresher" | "experienced" | "senior";
};

type ResumeUploadResult = {
  resume: Resume;
  extractedText: string;
  suggestedDomain: string;
};

type Optimization = {
  variant?: {
    id: string;
  };
  recommendation: {
    keywordGap: string[];
    tailoredResume: string;
    tailoredCoverLetter: string;
    truthGuardWarnings: string[];
  };
};

type AtsBreakdownItem = {
  label: string;
  score: number;
  max: number;
  detail: string;
};

type AtsLabResult = {
  mode: "resume_only" | "jd_tailor";
  resumeAts: {
    score: number;
    breakdown: AtsBreakdownItem[];
    recommendations: string[];
    signals: {
      parsedSkills: string[];
      parsedRoles: string[];
      parsedYears: number;
      topKeywords: string[];
    };
  };
  scoring?: {
    originalAtsScore: number;
    tailoredAtsScore: number;
    scoreLift: number;
    keywordGapBefore: string[];
    keywordGapAfter: string[];
    reasonsBefore: string[];
    reasonsAfter: string[];
  };
  recommendation?: {
    tailoredResume: string;
    tailoredCoverLetter: string;
    truthGuardWarnings: string[];
  };
  job?: {
    title: string;
    company: string;
    experienceLevel: string;
    remoteType: string;
  };
};

type Application = {
  id: string;
  stage: string;
  updatedAt: string;
  job: {
    title: string;
    company: string;
  } | null;
};

type Outreach = {
  id: string;
  company: string;
  contactChannel: string;
  contactValue: string;
  contactName?: string;
  website?: string;
  publicProfileUrl?: string;
  companyType?: string;
  companySize?: string;
  status: string;
  notes: string;
};

type Insights = {
  referrals: { profileUrl: string; messageDraft: string }[];
  interviewPack: {
    questions: string[];
    starAnswers: string[];
    domainQuestions: string[];
    plan30_60_90: string[];
  } | null;
  skillGapPlan: {
    quickWins: string[];
    mediumTerm: string[];
  } | null;
  portfolioRecommendation: {
    ordering: string[];
    rewriteTips: string[];
    summarySnippet: string;
  } | null;
  applyTimeRecommendation: {
    recommendedWindow: string;
    urgencyReason: string;
  } | null;
  risk: {
    risk: string;
    reasons: string[];
  } | null;
};

const DEFAULT_RESUME = "";
const USER_ID_STORAGE_KEY = "job_finder_user_id";

function getOrCreateUserId(): string {
  if (typeof window === "undefined") {
    return `user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  const existing = window.localStorage.getItem(USER_ID_STORAGE_KEY);
  if (existing && existing.trim()) {
    return existing;
  }

  const generated = `user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(USER_ID_STORAGE_KEY, generated);
  return generated;
}

function levelLabel(level: ExperienceLevel): string {
  if (level === "level0") {
    return "Fresher (Level 0)";
  }

  if (level === "level1") {
    return "Experienced (Level 1)";
  }

  return "Senior (Level 2)";
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;

  const response = await fetch(url, {
    ...init,
    headers: isFormData
      ? init?.headers
      : {
          "Content-Type": "application/json",
          ...(init?.headers ?? {})
        }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Request failed");
  }

  return (await response.json()) as T;
}

export default function HomePage() {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [sessionUserId] = useState(getOrCreateUserId);
  const [resumeText, setResumeText] = useState(DEFAULT_RESUME);
  const [fileName, setFileName] = useState("resume.txt");
  const [resume, setResume] = useState<Resume | null>(null);
  const [selectedUpload, setSelectedUpload] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customJd, setCustomJd] = useState("");
  const [customJobTitle, setCustomJobTitle] = useState("");
  const [customCompany, setCustomCompany] = useState("");
  const [atsLab, setAtsLab] = useState<AtsLabResult | null>(null);

  const [country, setCountry] = useState("Global");
  const [location, setLocation] = useState("Remote");
  const [domain, setDomain] = useState("");
  const [experiencePreference, setExperiencePreference] = useState<ExperiencePreference>("auto");
  const [postingWindow, setPostingWindow] = useState<PostingWindow>("7d");
  const [minScore, setMinScore] = useState(0);
  const [riskMax, setRiskMax] = useState<"low" | "medium" | "high">("high");

  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobRow | null>(null);
  const [optimization, setOptimization] = useState<Optimization | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [outreach, setOutreach] = useState<Outreach[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [funnel, setFunnel] = useState<Record<string, number> | null>(null);
  const [jobsNotice, setJobsNotice] = useState("");

  const [status, setStatus] = useState("Ready");
  const [busy, setBusy] = useState(false);

  const highFitCount = useMemo(() => jobs.filter((job) => job.fitScore >= 70).length, [jobs]);

  async function handleResumeFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setSelectedUpload("");
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);
    setSelectedUpload(file.name);

    const lowerName = file.name.toLowerCase();
    const isTextFile =
      file.type.startsWith("text/") || lowerName.endsWith(".txt") || lowerName.endsWith(".md");

    if (isTextFile) {
      const text = await file.text();
      setResumeText(text);
      setStatus(`Loaded ${file.name}. Click Parse Resume.`);
      return;
    }

    setStatus(`Selected ${file.name}. Parsing on server after clicking Parse Resume.`);
  }

  async function uploadResume() {
    setBusy(true);
    setStatus("Uploading and parsing resume...");

    try {
      let data: ResumeUploadResult;

      if (selectedFile) {
        const form = new FormData();
        form.append("userId", sessionUserId);
        form.append("file", selectedFile);

        data = await jsonFetch<ResumeUploadResult>("/api/resume/upload", {
          method: "POST",
          body: form
        });
      } else {
        data = await jsonFetch<ResumeUploadResult>("/api/resume/upload", {
          method: "POST",
          body: JSON.stringify({
            userId: sessionUserId,
            fileName,
            resumeText
          })
        });
      }

      setResume(data.resume);
      setResumeText(data.extractedText);
      setDomain(data.suggestedDomain.trim());
      setJobs([]);
      setJobsNotice("");
      setSelectedJob(null);
      setOptimization(null);
      setInsights(null);
      setAtsLab(null);

      setStatus(
        `Resume ready: ${data.resume.fileName} | ${levelLabel(data.resume.experienceLevel)} | ${data.resume.parsedYears} year(s) detected`
      );
    } catch (error) {
      setStatus(`Upload failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function runResumeOnlyAtsCheck() {
    if (!resume?.id && !resumeText.trim()) {
      setStatus("Upload or paste resume first.");
      return;
    }

    setBusy(true);
    setStatus("Analyzing resume ATS readiness...");

    try {
      const data = await jsonFetch<AtsLabResult>("/api/ats/analyze", {
        method: "POST",
        body: JSON.stringify({
          userId: sessionUserId,
          resumeId: resume?.id,
          resumeText
        })
      });
      setAtsLab(data);
      setStatus(`Resume ATS score ready: ${data.resumeAts.score}/100`);
    } catch (error) {
      setStatus(`ATS check failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function runJdTailorAndScore() {
    if (!resume?.id && !resumeText.trim()) {
      setStatus("Upload or paste resume first.");
      return;
    }
    if (!customJd.trim()) {
      setStatus("Paste a job description to generate a tailored resume.");
      return;
    }

    setBusy(true);
    setStatus("Generating JD-matched tailored resume and ATS score...");

    try {
      const data = await jsonFetch<AtsLabResult>("/api/ats/analyze", {
        method: "POST",
        body: JSON.stringify({
          userId: sessionUserId,
          resumeId: resume?.id,
          resumeText,
          jobDescription: customJd,
          jobTitle: customJobTitle,
          company: customCompany
        })
      });
      setAtsLab(data);
      if (data.scoring) {
        setStatus(
          `Tailored ATS score: ${data.scoring.tailoredAtsScore}/100 (lift ${data.scoring.scoreLift >= 0 ? "+" : ""}${data.scoring.scoreLift})`
        );
      } else {
        setStatus("Tailored resume generated.");
      }
    } catch (error) {
      setStatus(`JD tailoring failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function runSearch(mode: "replace" | "append" = "replace") {
    if (!resume?.id) {
      setStatus("Upload resume first.");
      return;
    }

    setBusy(true);
    setStatus(mode === "append" ? "Searching for more related jobs..." : "Running resume-driven job search...");

    try {
      await jsonFetch("/api/search/run", {
        method: "POST",
        body: JSON.stringify({
          userId: sessionUserId,
          resumeId: resume.id,
          country,
          location,
          domain,
          postingWindow,
          experienceLevel: experiencePreference === "auto" ? undefined : experiencePreference,
          mode,
          excludeJobIds: mode === "append" ? jobs.map((job) => job.id) : []
        })
      });

      await Promise.all([loadJobs(resume.id), loadOutreach(), loadApplications(), loadFunnel()]);
      setStatus(
        mode === "append"
          ? "More related jobs loaded and merged without duplicates."
          : "Search complete. Jobs now ranked using resume + experience level."
      );
    } catch (error) {
      setStatus(`Search failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function loadJobs(resumeId = resume?.id) {
    if (!resumeId) {
      return [];
    }

    const params = new URLSearchParams({
      userId: sessionUserId,
      resumeId,
      minScore: String(minScore),
      riskMax,
      country,
      location,
      postingWindow
    });

    if (experiencePreference !== "auto") {
      params.set("experienceLevel", experiencePreference);
    }

    const data = await jsonFetch<{ jobs: JobRow[] }>(`/api/jobs?${params.toString()}`);

    if (data.jobs.length > 0) {
      setJobs(data.jobs);
      setJobsNotice("");
      return data.jobs;
    }

    const relaxedParams = new URLSearchParams({
      userId: sessionUserId,
      resumeId,
      minScore: "0",
      riskMax: "high",
      country,
      location,
      postingWindow
    });

    if (experiencePreference !== "auto") {
      relaxedParams.set("experienceLevel", experiencePreference);
    }

    const relaxed = await jsonFetch<{ jobs: JobRow[] }>(`/api/jobs?${relaxedParams.toString()}`);
    setJobs(relaxed.jobs);

    if (relaxed.jobs.length > 0) {
      setJobsNotice("No jobs matched the current score/risk filters, so the best available matches are shown below.");
    } else {
      setJobsNotice("No jobs matched these search filters yet. Try lowering score, widening location, or changing posted window.");
    }

    return relaxed.jobs;
  }

  async function loadApplications() {
    const data = await jsonFetch<{ applications: Application[] }>(`/api/applications?userId=${sessionUserId}`);
    setApplications(data.applications);
  }

  async function loadOutreach() {
    const data = await jsonFetch<{ outreach: Outreach[] }>(`/api/outreach?userId=${sessionUserId}`);
    setOutreach(data.outreach);
  }

  async function loadFunnel() {
    const data = await jsonFetch<{ byStage: Record<string, number> }>(`/api/analytics/funnel?userId=${sessionUserId}`);
    setFunnel(data.byStage);
  }

  async function optimizeForJob(job: JobRow) {
    if (!resume?.id) {
      setStatus("Upload resume first.");
      return;
    }

    setBusy(true);
    setSelectedJob(job);
    setStatus("Generating ATS-tailored resume copy and cover letter...");

    try {
      const data = await jsonFetch<Optimization>(`/api/jobs/${job.id}/optimize`, {
        method: "POST",
        body: JSON.stringify({
          userId: sessionUserId,
          resumeId: resume.id
        })
      });

      setOptimization(data);
      await loadInsights(job.id);
      setStatus("Optimization ready. Review warnings before applying.");
    } catch (error) {
      setStatus(`Optimization failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function loadInsights(jobId: string) {
    if (!resume?.id) {
      return;
    }

    try {
      const [ref, interview, skillGap, portfolio, applyTime, risk] = await Promise.all([
        jsonFetch<{ referrals: { profileUrl: string; messageDraft: string }[] }>(
          `/api/referrals?userId=${sessionUserId}&jobId=${jobId}`
        ),
        jsonFetch<{ interviewPack: Insights["interviewPack"] }>("/api/interview-packs/generate", {
          method: "POST",
          body: JSON.stringify({ userId: sessionUserId, jobId })
        }),
        jsonFetch<{ skillGapPlan: Insights["skillGapPlan"] }>(
          `/api/skill-gap?userId=${sessionUserId}&resumeId=${resume.id}&jobId=${jobId}`
        ),
        jsonFetch<{ portfolioRecommendation: Insights["portfolioRecommendation"] }>(
          `/api/portfolio/optimize/${jobId}?userId=${sessionUserId}`
        ),
        jsonFetch<{ applyTimeRecommendation: Insights["applyTimeRecommendation"] }>(
          `/api/apply-time/recommendations?userId=${sessionUserId}&jobId=${jobId}&timezone=Asia/Calcutta`
        ),
        jsonFetch<{ risk: string; reasons: string[] }>(`/api/jobs/${jobId}/risk`)
      ]);

      setInsights({
        referrals: ref.referrals,
        interviewPack: interview.interviewPack,
        skillGapPlan: skillGap.skillGapPlan,
        portfolioRecommendation: portfolio.portfolioRecommendation,
        applyTimeRecommendation: applyTime.applyTimeRecommendation,
        risk
      });
    } catch {
      setInsights(null);
    }
  }

  async function addApplication(jobId: string) {
    setBusy(true);
    setStatus("Adding job to application tracker...");

    try {
      const data = await jsonFetch<{ application: Application }>("/api/applications", {
        method: "POST",
        body: JSON.stringify({
          userId: sessionUserId,
          jobId,
          stage: "applied"
        })
      });

      await Promise.all([loadApplications(), loadFunnel()]);
      setStatus(`Application tracked: ${data.application.id}`);
    } catch (error) {
      setStatus(`Could not track application: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function applyToJob(job: JobRow) {
    setBusy(true);
    setStatus("Opening application link and tracking it in your dashboard...");

    try {
      const data = await jsonFetch<{ application: Application; reused?: boolean }>("/api/applications", {
        method: "POST",
        body: JSON.stringify({
          userId: sessionUserId,
          jobId: job.id,
          stage: "applied"
        })
      });

      await Promise.all([loadApplications(), loadFunnel()]);
      window.open(job.applyUrl, "_blank", "noopener,noreferrer");
      setStatus(
        data.reused
          ? "Application link opened. Existing tracker entry reused."
          : "Application link opened and added to tracker."
      );
    } catch (error) {
      setStatus(`Could not open and track application: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function moveApplicationStage(appId: string, stage: string) {
    setBusy(true);

    try {
      await jsonFetch(`/api/applications/${appId}/stage`, {
        method: "PATCH",
        body: JSON.stringify({
          userId: sessionUserId,
          stage,
          source: "manual"
        })
      });

      await Promise.all([loadApplications(), loadFunnel()]);
      setStatus(`Application moved to ${stage}.`);
    } catch (error) {
      setStatus(`Stage update failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function generateFollowUps(applicationId: string) {
    setBusy(true);

    try {
      await jsonFetch("/api/followups/generate", {
        method: "POST",
        body: JSON.stringify({
          userId: sessionUserId,
          applicationId
        })
      });

      setStatus("Follow-up sequence created for days 3/7/14.");
    } catch (error) {
      setStatus(`Follow-up generation failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function resetDemoData() {
    setBusy(true);

    try {
      await jsonFetch("/api/admin/reset", {
        method: "POST",
        body: JSON.stringify({})
      });

      setResume(null);
      setResumeText(DEFAULT_RESUME);
      setFileName("resume.txt");
      setSelectedUpload("");
      setSelectedFile(null);
      setJobs([]);
      setJobsNotice("");
      setSelectedJob(null);
      setOptimization(null);
      setApplications([]);
      setOutreach([]);
      setInsights(null);
      setFunnel(null);
      setAtsLab(null);
      setCustomJd("");
      setCustomJobTitle("");
      setCustomCompany("");
      setDomain("");
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
      setStatus("Demo data reset. Upload resume and run a fresh search.");
    } catch (error) {
      setStatus(`Reset failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  function exportCsv(type: "jobs" | "outreach") {
    window.open(`/api/export?userId=${sessionUserId}&type=${type}&format=csv`, "_blank", "noopener,noreferrer");
  }

  function downloadPdf(type: "original_resume" | "tailored_resume" | "cover_letter") {
    if (!resume?.id) {
      setStatus("Upload and parse a resume first.");
      return;
    }

    const params = new URLSearchParams({
      userId: sessionUserId,
      resumeId: resume.id,
      type
    });

    if (selectedJob?.id && type !== "original_resume") {
      params.set("jobId", selectedJob.id);
    }

    window.open(`/api/documents/pdf?${params.toString()}`, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="main">
      <section className="hero">
        <h1>AI Job Landing Dashboard</h1>
        <p>
          Upload resume, run global search, optimize ATS content per job, track applications, and manage outreach in one
          place.
        </p>
        <p className="muted">
          Status: {status} {busy ? "(working...)" : ""}
        </p>
      </section>

      <section className="grid">
        <article className="card span-12 ats-lab">
          <div className="ats-lab-head">
            <div>
              <h2>ATS Lab: Custom JD + Resume</h2>
              <p className="muted">
                Paste any job description to generate a tailored resume with ATS score lift, or run a resume-only ATS
                readiness check.
              </p>
            </div>
            <div className="actions">
              <button onClick={() => void runJdTailorAndScore()} disabled={busy || (!resumeText.trim() && !resume?.id)}>
                Generate Tailored Resume + ATS Score
              </button>
              <button
                className="ghost"
                onClick={() => void runResumeOnlyAtsCheck()}
                disabled={busy || (!resumeText.trim() && !resume?.id)}
              >
                Check Resume ATS Score
              </button>
            </div>
          </div>

          <div className="row" style={{ marginTop: 10 }}>
            <div>
              <label>Target Job Title (optional)</label>
              <input
                value={customJobTitle}
                onChange={(event) => setCustomJobTitle(event.target.value)}
                placeholder="e.g. ML Engineer"
              />
            </div>
            <div>
              <label>Target Company (optional)</label>
              <input
                value={customCompany}
                onChange={(event) => setCustomCompany(event.target.value)}
                placeholder="e.g. OpenAI"
              />
            </div>
          </div>

          <label style={{ marginTop: 10 }}>Paste Job Description</label>
          <textarea
            value={customJd}
            onChange={(event) => setCustomJd(event.target.value)}
            placeholder="Paste complete JD here to tailor your resume and estimate ATS score for that specific role."
          />

          {atsLab ? (
            <div className="ats-results">
              <div className="score-grid">
                <div className="score-card">
                  <span className="muted">Resume ATS Readiness</span>
                  <strong>{atsLab.resumeAts.score}/100</strong>
                </div>
                {atsLab.scoring ? (
                  <>
                    <div className="score-card">
                      <span className="muted">Current ATS vs JD</span>
                      <strong>{atsLab.scoring.originalAtsScore}/100</strong>
                    </div>
                    <div className="score-card highlight">
                      <span className="muted">Tailored ATS vs JD</span>
                      <strong>{atsLab.scoring.tailoredAtsScore}/100</strong>
                    </div>
                    <div className="score-card">
                      <span className="muted">Score Lift</span>
                      <strong>
                        {atsLab.scoring.scoreLift >= 0 ? "+" : ""}
                        {atsLab.scoring.scoreLift}
                      </strong>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="row" style={{ marginTop: 10 }}>
                <div className="item">
                  <strong>ATS Breakdown</strong>
                  <div className="muted" style={{ marginTop: 6 }}>
                    {atsLab.resumeAts.breakdown.map((entry) => `${entry.label}: ${entry.score}/${entry.max}`).join(" | ")}
                  </div>
                </div>
                <div className="item">
                  <strong>Improve ATS Fast</strong>
                  <div className="muted" style={{ marginTop: 6 }}>
                    {atsLab.resumeAts.recommendations.join(" | ") || "Your resume is ATS-friendly. Keep refining role-specific keywords."}
                  </div>
                </div>
              </div>

              {atsLab.scoring ? (
                <div className="row" style={{ marginTop: 10 }}>
                  <div className="item">
                    <strong>Keyword Gap (Before)</strong>
                    <div className="muted">{atsLab.scoring.keywordGapBefore.join(", ") || "None"}</div>
                  </div>
                  <div className="item">
                    <strong>Keyword Gap (After)</strong>
                    <div className="muted">{atsLab.scoring.keywordGapAfter.join(", ") || "None"}</div>
                  </div>
                </div>
              ) : null}

              {atsLab.recommendation ? (
                <div className="row" style={{ marginTop: 10 }}>
                  <div className="item">
                    <strong>Tailored Resume</strong>
                    <pre>{atsLab.recommendation.tailoredResume}</pre>
                  </div>
                  <div className="item">
                    <strong>Tailored Cover Letter</strong>
                    <pre>{atsLab.recommendation.tailoredCoverLetter}</pre>
                    <div className="muted" style={{ marginTop: 8 }}>
                      Truth guard: {atsLab.recommendation.truthGuardWarnings.join(" | ") || "No warnings"}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </article>

        <article className="card span-5">
          <h2>1) Resume Upload</h2>
          <label>Upload Resume File (TXT / PDF / DOC / DOCX)</label>
          <div className="upload-zone">
            <input
              ref={uploadInputRef}
              type="file"
              accept=".txt,.md,.pdf,.doc,.docx,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => void handleResumeFileChange(event)}
            />
            <p className="muted">
              {selectedUpload
                ? `Selected: ${selectedUpload}`
                : "Choose file. PDF/DOCX parsing now happens on server when you click Parse Resume."}
            </p>
          </div>
          <label>Resume File Name</label>
          <input value={fileName} onChange={(e) => setFileName(e.target.value)} />
          <label style={{ marginTop: 10 }}>Resume Text (auto-filled after parsing)</label>
          <textarea value={resumeText} onChange={(e) => setResumeText(e.target.value)} />
          <div className="actions">
            <button onClick={uploadResume} disabled={busy}>
              Parse Resume
            </button>
            <button className="ghost" onClick={resetDemoData} disabled={busy}>
              Reset Demo Data
            </button>
          </div>
          {resume ? (
            <div className="item" style={{ marginTop: 10 }}>
              <strong>Resume ID:</strong> {resume.id}
              <br />
              <span className="muted">Level:</span> {levelLabel(resume.experienceLevel)}
              <br />
              <span className="muted">Top skills:</span> {resume.parsedSkills.slice(0, 8).join(", ")}
            </div>
          ) : null}
        </article>

        <article className="card span-7">
          <h2>2) Search Filters + Run</h2>
          <div className="row">
            <div>
              <label>Country</label>
              <input value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
            <div>
              <label>Location</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <div>
              <label>Domain / Field (optional, auto-inferred from resume if empty)</label>
              <input value={domain} onChange={(e) => setDomain(e.target.value)} />
            </div>
            <div>
              <label>Risk Max</label>
              <select value={riskMax} onChange={(e) => setRiskMax(e.target.value as "low" | "medium" | "high")}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <div>
              <label>Experience Target</label>
              <select
                value={experiencePreference}
                onChange={(e) => setExperiencePreference(e.target.value as ExperiencePreference)}
              >
                <option value="auto">Auto from Resume</option>
                <option value="level0">Fresher (Level 0)</option>
                <option value="level1">Experienced (Level 1)</option>
                <option value="level2">Senior (Level 2)</option>
              </select>
            </div>
            <div>
              <label>Posted Within</label>
              <select value={postingWindow} onChange={(e) => setPostingWindow(e.target.value as PostingWindow)}>
                <option value="1h">Last 1 hour</option>
                <option value="3d">Last 3 days</option>
                <option value="7d">Last 7 days</option>
                <option value="15d">Last 15 days</option>
              </select>
            </div>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <div>
              <label>Min Fit Score ({minScore}%)</label>
              <input
                type="range"
                min={0}
                max={95}
                step={5}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="actions" style={{ marginTop: 12 }}>
            <button onClick={() => void runSearch()} disabled={busy || !resume}>
              Run Search Now
            </button>
            <button className="ghost" onClick={() => void runSearch("append")} disabled={busy || !resume}>
              Search More
            </button>
            <button className="ghost" onClick={() => void runSearch("replace")} disabled={busy || !resume}>
              Refresh Jobs
            </button>
            <button className="secondary" onClick={() => exportCsv("jobs")}>
              Export Jobs CSV
            </button>
            <button className="secondary" onClick={() => exportCsv("outreach")}>
              Export Outreach CSV
            </button>
          </div>

          <div className="item" style={{ marginTop: 12 }}>
            <strong>Total jobs:</strong> {jobs.length} | <strong>70%+ fit:</strong> {highFitCount}
          </div>
        </article>

        <article className="card span-8">
          <h2>3) Matched Jobs</h2>
          <div className="jobs">
            {jobsNotice ? <p className="muted" style={{ marginBottom: 12 }}>{jobsNotice}</p> : null}
            {jobs.map((job) => (
              <div className="job" key={job.id}>
                <div className="job-head">
                  <div>
                    <strong>{job.title}</strong> at <strong>{job.company}</strong>
                    <div className="muted">
                      {job.location}, {job.country} | {job.remoteType} | posted {new Date(job.postedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span className="badge">Fit: {job.fitScore}%</span>
                    <span className="badge">{levelLabel(job.experienceLevel)}</span>
                    <span className={job.risk === "low" ? "badge" : "badge warn"}>Risk: {job.risk}</span>
                  </div>
                </div>
                <div className="muted" style={{ marginTop: 6 }}>
                  Apply: <a href={job.applyUrl}>{job.applyUrl}</a>
                  <br />
                  Company: <a href={job.companySite}>{job.companySite}</a>
                  <br />
                  Public recruiter/company profile:{" "}
                  <a href={job.publicRecruiterProfiles?.[0] ?? job.companySite}>
                    {job.publicRecruiterProfiles?.[0] ?? job.companySite}
                  </a>
                  <br />
                  Contact: {job.companyContactEmail ?? "Use official careers page or public recruiter/company profile"}
                </div>
                <div className="actions">
                  <button onClick={() => void applyToJob(job)} disabled={busy}>
                    Apply Now
                  </button>
                  <button onClick={() => void optimizeForJob(job)} disabled={busy}>
                    ATS Optimize
                  </button>
                  <button className="ghost" onClick={() => void addApplication(job.id)} disabled={busy}>
                    Track Application
                  </button>
                </div>
              </div>
            ))}

            {jobs.length === 0 ? <p className="muted">No jobs yet. Upload resume and run search.</p> : null}
          </div>
        </article>

        <article className="card span-4">
          <h2>4) ATS + Insights</h2>
          {selectedJob ? (
            <div className="list">
              <div className="item">
                <strong>{selectedJob.title}</strong> at {selectedJob.company}
              </div>

              {optimization ? (
                <>
                  <div className="item">
                    <strong>Keyword Gap:</strong>
                    <div className="muted">{optimization.recommendation.keywordGap.join(", ") || "None"}</div>
                  </div>

                  <div className="item">
                    <strong>Truth Guard Warnings</strong>
                    <div className="muted">
                      {optimization.recommendation.truthGuardWarnings.join(" | ") || "No warnings"}
                    </div>
                  </div>

                  <div className="item">
                    <strong>Tailored Resume Copy</strong>
                    <div className="actions" style={{ marginTop: 8 }}>
                      <button className="ghost" onClick={() => downloadPdf("original_resume")}>
                        Download Input Resume PDF
                      </button>
                      <button className="ghost" onClick={() => downloadPdf("tailored_resume")}>
                        Download Tailored Resume PDF
                      </button>
                    </div>
                    <pre>{optimization.recommendation.tailoredResume}</pre>
                  </div>

                  <div className="item">
                    <strong>Tailored Cover Letter</strong>
                    <div className="actions" style={{ marginTop: 8 }}>
                      <button className="ghost" onClick={() => downloadPdf("cover_letter")}>
                        Download Cover Letter PDF
                      </button>
                    </div>
                    <pre>{optimization.recommendation.tailoredCoverLetter}</pre>
                  </div>
                </>
              ) : (
                <p className="muted">Click ATS Optimize on a job to generate tailored content.</p>
              )}

              {insights ? (
                <>
                  <div className="item">
                    <strong>Apply Time</strong>
                    <div className="muted">{insights.applyTimeRecommendation?.recommendedWindow}</div>
                  </div>
                  <div className="item">
                    <strong>Skill Gap Quick Wins</strong>
                    <div className="muted">{insights.skillGapPlan?.quickWins.join(" | ")}</div>
                  </div>
                  <div className="item">
                    <strong>Referral Leads</strong>
                    <div className="muted">{insights.referrals.map((r) => r.profileUrl).join(" | ")}</div>
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <p className="muted">Select a job from the list to see optimization and interview insights.</p>
          )}
        </article>

        <article className="card span-6">
          <h2>5) Application Tracker</h2>
          <div className="list">
            {applications.map((app) => (
              <div className="item" key={app.id}>
                <strong>{app.job?.title ?? "Archived role"}</strong> @ {app.job?.company ?? "Archived company"}
                <div className="muted">
                  Stage: {app.stage} | Updated: {new Date(app.updatedAt).toLocaleString()}
                </div>
                <div className="actions">
                  <button className="ghost" onClick={() => void moveApplicationStage(app.id, "screen")}>
                    Move to Screen
                  </button>
                  <button className="ghost" onClick={() => void moveApplicationStage(app.id, "interview")}>
                    Move to Interview
                  </button>
                  <button onClick={() => void generateFollowUps(app.id)}>Generate Follow-ups</button>
                </div>
              </div>
            ))}
            {applications.length === 0 ? <p className="muted">No tracked applications yet.</p> : null}
          </div>
        </article>

        <article className="card span-6">
          <h2>6) Funnel + Outreach CRM</h2>
          <div className="item">
            <strong>Funnel Snapshot</strong>
            <div className="muted">{funnel ? JSON.stringify(funnel) : "Run search and track applications to see funnel."}</div>
          </div>

          <div className="list" style={{ marginTop: 10 }}>
            {outreach.map((row) => (
              <div className="item" key={row.id}>
                <strong>{row.company}</strong>
                <div className="muted">
                  {[row.companyType, row.companySize].filter(Boolean).join(" | ")}
                  {row.companyType || row.companySize ? <br /> : null}
                  {row.contactName ?? "Recruiting Team"}
                  <br />
                  {row.contactChannel}: <a href={row.contactValue}>{row.contactValue}</a>
                  <br />
                  Website: {row.website ? <a href={row.website}>{row.website}</a> : "Not available"}
                  <br />
                  Public profile: {row.publicProfileUrl ? <a href={row.publicProfileUrl}>{row.publicProfileUrl}</a> : "Not available"}
                  <br />
                  Status: {row.status}
                  <br />
                  {row.notes}
                </div>
              </div>
            ))}
            {outreach.length === 0 ? <p className="muted">No outreach rows yet. Run search to seed outreach targets.</p> : null}
          </div>
        </article>
      </section>
    </main>
  );
}

