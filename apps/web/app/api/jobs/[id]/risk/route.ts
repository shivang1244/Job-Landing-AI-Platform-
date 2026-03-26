import { NextRequest } from "next/server";
import { readDb } from "@/lib/data-store";
import { notFound, ok } from "@/lib/http";
import { riskReasons } from "@/lib/seeds";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = readDb();
  const job = db.jobs.find((item) => item.id === params.id);

  if (!job) {
    return notFound("Job not found.");
  }

  return ok({
    risk: job.risk,
    reasons: riskReasons(job.risk)
  });
}
