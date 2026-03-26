export type ApplicationStage =
  | "saved"
  | "applied"
  | "screen"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

export type ExperienceLevel = "level0" | "level1" | "level2";

export type ExperienceLabel = "fresher" | "experienced" | "senior";

export interface ResumeMaster {
  id: string;
  userId: string;
  fileName: string;
  rawText: string;
  parsedSkills: string[];
  parsedRoles: string[];
  parsedLocations: string[];
  parsedYears: number;
  experienceLevel: ExperienceLevel;
  experienceLabel: ExperienceLabel;
  createdAt: string;
}

export interface ResumeVariant {
  id: string;
  userId: string;
  resumeId: string;
  jobId: string;
  tailoredResume: string;
  tailoredCoverLetter: string;
  keywordGaps: string[];
  warnings: string[];
  createdAt: string;
}

export interface JobPosting {
  id: string;
  source: string;
  title: string;
  company: string;
  country: string;
  location: string;
  remoteType: "remote" | "hybrid" | "onsite";
  postedAt: string;
  applyUrl: string;
  companySite: string;
  companyContactEmail?: string;
  publicRecruiterProfiles: string[];
  salary?: string;
  visaSponsorship?: "unknown" | "yes" | "no";
  experienceLevel: ExperienceLevel;
  description: string;
  risk: "low" | "medium" | "high";
}

export interface JobMatch {
  id: string;
  userId: string;
  resumeId: string;
  jobId: string;
  fitScore: number;
  reasons: string[];
  missingKeywords: string[];
  createdAt: string;
}

export interface ATSRecommendation {
  id: string;
  userId: string;
  resumeId: string;
  jobId: string;
  keywordGap: string[];
  tailoredResume: string;
  tailoredCoverLetter: string;
  truthGuardWarnings: string[];
  createdAt: string;
}

export interface ApplicationEvent {
  stage: ApplicationStage;
  source: "manual" | "email_detected" | "integration";
  timestamp: string;
  note?: string;
}

export interface Application {
  id: string;
  userId: string;
  jobId: string;
  jobSnapshotTitle?: string;
  jobSnapshotCompany?: string;
  resumeVariantId?: string;
  stage: ApplicationStage;
  history: ApplicationEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpTask {
  id: string;
  userId: string;
  applicationId: string;
  dueAt: string;
  status: "pending" | "done" | "canceled";
  draftMessage: string;
  createdAt: string;
}

export interface ReferralLead {
  id: string;
  userId: string;
  jobId: string;
  company: string;
  profileUrl: string;
  messageDraft: string;
  createdAt: string;
}

export interface InterviewPack {
  id: string;
  userId: string;
  jobId: string;
  questions: string[];
  starAnswers: string[];
  domainQuestions: string[];
  plan30_60_90: string[];
  createdAt: string;
}

export interface TruthGuardResult {
  id: string;
  userId: string;
  jobId: string;
  warnings: string[];
  blockedClaims: string[];
  createdAt: string;
}

export interface SkillGapPlan {
  id: string;
  userId: string;
  jobId: string;
  quickWins: string[];
  mediumTerm: string[];
  createdAt: string;
}

export interface PortfolioRecommendation {
  id: string;
  userId: string;
  jobId: string;
  ordering: string[];
  rewriteTips: string[];
  summarySnippet: string;
  createdAt: string;
}

export interface ApplyTimeRecommendation {
  id: string;
  userId: string;
  jobId: string;
  timezone: string;
  recommendedWindow: string;
  urgencyReason: string;
  createdAt: string;
}

export interface OutreachThread {
  id: string;
  userId: string;
  company: string;
  contactChannel: string;
  contactValue: string;
  contactName?: string;
  website?: string;
  publicProfileUrl?: string;
  companyType?: string;
  companySize?: string;
  status: "new" | "contacted" | "responded" | "closed";
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeExperiment {
  id: string;
  userId: string;
  resumeVariantId: string;
  jobCategory: string;
  outcome: "unknown" | "callback" | "interview" | "rejected";
  createdAt: string;
}

export interface DbState {
  resumes: ResumeMaster[];
  jobs: JobPosting[];
  matches: JobMatch[];
  recommendations: ATSRecommendation[];
  applications: Application[];
  followUps: FollowUpTask[];
  referrals: ReferralLead[];
  interviewPacks: InterviewPack[];
  truthGuardResults: TruthGuardResult[];
  skillGapPlans: SkillGapPlan[];
  portfolioRecommendations: PortfolioRecommendation[];
  applyTimeRecommendations: ApplyTimeRecommendation[];
  outreachThreads: OutreachThread[];
  resumeVariants: ResumeVariant[];
  resumeExperiments: ResumeExperiment[];
}
