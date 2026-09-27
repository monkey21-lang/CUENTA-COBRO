import { NextResponse } from "next/server";

export function jsonResponse<T>(body: T, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return NextResponse.json(body, { ...init, headers });
}