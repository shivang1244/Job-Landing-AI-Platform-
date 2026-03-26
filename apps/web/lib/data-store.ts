import fs from "node:fs";
import path from "node:path";
import { DbState } from "@/lib/types";

const DB_PATH = path.join(process.cwd(), "data", "dev-db.json");

const initialState: DbState = {
  resumes: [],
  jobs: [],
  matches: [],
  recommendations: [],
  applications: [],
  followUps: [],
  referrals: [],
  interviewPacks: [],
  truthGuardResults: [],
  skillGapPlans: [],
  portfolioRecommendations: [],
  applyTimeRecommendations: [],
  outreachThreads: [],
  resumeVariants: [],
  resumeExperiments: []
};

function ensureDbFile() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(initialState, null, 2), "utf-8");
  }
}

export function readDb(): DbState {
  ensureDbFile();
  const raw = fs.readFileSync(DB_PATH, "utf-8");

  try {
    return JSON.parse(raw) as DbState;
  } catch {
    fs.writeFileSync(DB_PATH, JSON.stringify(initialState, null, 2), "utf-8");
    return initialState;
  }
}

export function writeDb(nextState: DbState) {
  ensureDbFile();
  fs.writeFileSync(DB_PATH, JSON.stringify(nextState, null, 2), "utf-8");
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
