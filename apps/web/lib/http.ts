import { NextResponse } from "next/server";

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function notFound(message: string) {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function ok<T>(payload: T) {
  return NextResponse.json(payload, { status: 200 });
}

export function serverError(message: string) {
  return NextResponse.json({ error: message }, { status: 500 });
}
