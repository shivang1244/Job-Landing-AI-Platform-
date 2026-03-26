import mammoth from "mammoth";
import pdfParse from "pdf-parse";

function normalizeExtractedText(text: string): string {
  return text
    .replace(/\u0000/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[^\S\r\n]{2,}/g, " ")
    .trim();
}

export async function extractResumeText(fileName: string, buffer: Buffer): Promise<string> {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".txt") || lower.endsWith(".md")) {
    return normalizeExtractedText(buffer.toString("utf-8"));
  }

  if (lower.endsWith(".pdf")) {
    const parsed = await pdfParse(buffer);
    return normalizeExtractedText(parsed.text);
  }

  if (lower.endsWith(".docx")) {
    const parsed = await mammoth.extractRawText({ buffer });
    return normalizeExtractedText(parsed.value);
  }

  throw new Error("Unsupported file type. Please upload TXT, PDF, or DOCX.");
}
