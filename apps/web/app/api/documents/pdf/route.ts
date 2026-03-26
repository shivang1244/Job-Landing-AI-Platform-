import { NextRequest } from "next/server";
import { readDb } from "@/lib/data-store";
import { badRequest, notFound } from "@/lib/http";
import { getUserId } from "@/lib/logic";

export const runtime = "nodejs";

function escapePdfText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "?");
}

function wrapLines(text: string, maxChars = 92): string[] {
  const sourceLines = text.replace(/\r/g, "").split("\n");
  const wrapped: string[] = [];

  for (const sourceLine of sourceLines) {
    const line = sourceLine.trimEnd();
    if (!line) {
      wrapped.push("");
      continue;
    }

    let remaining = line;
    while (remaining.length > maxChars) {
      const splitAt = remaining.lastIndexOf(" ", maxChars);
      const index = splitAt > 20 ? splitAt : maxChars;
      wrapped.push(remaining.slice(0, index).trimEnd());
      remaining = remaining.slice(index).trimStart();
    }

    wrapped.push(remaining);
  }

  return wrapped;
}

function buildPdf(title: string, subtitle: string, body: string): Buffer {
  const pageWidth = 595;
  const pageHeight = 842;
  const left = 48;
  const top = 800;
  const lineHeight = 14;
  const lines = [
    title.toUpperCase(),
    subtitle,
    "",
    ...wrapLines(body)
  ];

  const pages: string[][] = [];
  let current: string[] = [];
  let y = top;

  for (const line of lines) {
    if (y < 60) {
      pages.push(current);
      current = [];
      y = top;
    }

    current.push(`BT /F1 11 Tf 1 0 0 1 ${left} ${y} Tm (${escapePdfText(line)}) Tj ET`);
    y -= lineHeight;
  }

  if (current.length > 0) {
    pages.push(current);
  }

  const objects: string[] = [];
  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");

  const pageRefs = pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ");
  objects.push(`2 0 obj << /Type /Pages /Count ${pages.length} /Kids [ ${pageRefs} ] >> endobj`);

  pages.forEach((contentLines, index) => {
    const pageObj = 3 + index * 2;
    const contentObj = pageObj + 1;
    const stream = ["BT /F1 18 Tf 1 0 0 1 48 820 Tm (" + escapePdfText(title) + ") Tj ET", ...contentLines.slice(1)].join("\n");
    objects.push(
      `${pageObj} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentObj} 0 R >> endobj`
    );
    objects.push(`${contentObj} 0 obj << /Length ${Buffer.byteLength(stream, "utf8")} >> stream\n${stream}\nendstream\nendobj`);
  });

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${object}\n`;
  }

  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = getUserId(searchParams.get("userId"));
  const resumeId = searchParams.get("resumeId");
  const jobId = searchParams.get("jobId");
  const type = searchParams.get("type");

  if (!resumeId || !type) {
    return badRequest("resumeId and type are required.");
  }

  const db = readDb();
  const resume = db.resumes.find((item) => item.id === resumeId && item.userId === userId);

  if (!resume) {
    return notFound("Resume not found.");
  }

  let title = "Resume";
  let subtitle = resume.fileName;
  let body = resume.rawText;
  let filename = "resume.pdf";

  if (type === "tailored_resume" || type === "cover_letter") {
    if (!jobId) {
      return badRequest("jobId is required for tailored documents.");
    }

    const recommendation = [...db.recommendations]
      .reverse()
      .find((item) => item.userId === userId && item.resumeId === resumeId && item.jobId === jobId);
    const job = db.jobs.find((item) => item.id === jobId);

    if (!recommendation || !job) {
      return notFound("Tailored document not found for this job.");
    }

    if (type === "tailored_resume") {
      title = `Tailored Resume - ${job.title}`;
      subtitle = `${job.company} | Compared against ${resume.fileName}`;
      body = recommendation.tailoredResume;
      filename = "tailored-resume.pdf";
    } else {
      title = `Cover Letter - ${job.title}`;
      subtitle = `${job.company} | Generated from your resume`;
      body = recommendation.tailoredCoverLetter;
      filename = "cover-letter.pdf";
    }
  } else if (type !== "original_resume") {
    return badRequest("Unsupported PDF type.");
  }

  const pdf = buildPdf(title, subtitle, body);

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=${filename}`
    }
  });
}
