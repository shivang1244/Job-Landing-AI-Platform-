import { NextRequest } from "next/server";
import { readDb } from "@/lib/data-store";
import { badRequest } from "@/lib/http";
import { getUserId } from "@/lib/logic";

function toCsv(rows: Record<string, string | number | undefined>[]) {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const escape = (value: string | number | undefined) => {
    const raw = String(value ?? "").replace(/\r?\n/g, " ").trim();
    return `"${raw.replace(/"/g, '""')}"`;
  };

  const lines = [headers.map((header) => escape(header)).join(",")];
  for (const row of rows) {
    lines.push(headers.map((key) => escape(row[key])).join(","));
  }

  return lines.join("\n");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = getUserId(searchParams.get("userId"));
  const type = searchParams.get("type") ?? "jobs";
  const format = searchParams.get("format") ?? "csv";

  if (format !== "csv") {
    return badRequest("Only CSV export is currently implemented in this build.");
  }

  const db = readDb();

  if (type === "outreach") {
    const rows = db.outreachThreads
      .filter((item) => item.userId === userId)
      .map((item) => ({
        company: item.company,
        company_type: item.companyType,
        company_size: item.companySize,
        website: item.website,
        contact_channel: item.contactChannel,
        contact_name: item.contactName,
        contact_value: item.contactValue,
        public_profile_url: item.publicProfileUrl,
        status: item.status,
        notes: item.notes,
        updated_at: item.updatedAt
      }));

    return new Response(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=outreach.csv"
      }
    });
  }

  const matches = db.matches.filter((m) => m.userId === userId);
  const rows = matches
    .map((m) => {
      const job = db.jobs.find((j) => j.id === m.jobId);
      if (!job) {
        return null;
      }

      return {
        title: job.title,
        company: job.company,
        source: job.source,
        country: job.country,
        location: job.location,
        remote_type: job.remoteType,
        experience_level: job.experienceLevel,
        fit_score: m.fitScore,
        apply_url: job.applyUrl,
        company_site: job.companySite,
        contact_email: job.companyContactEmail,
        public_profile_url: job.publicRecruiterProfiles[0],
        posted_at: job.postedAt
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=jobs.csv"
    }
  });
}
