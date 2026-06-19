import { NextResponse } from "next/server";

// Returns current server UTC timestamp in ms.
// Used by clients to calibrate their local clock against server time
// so all pomodoro countdowns are synchronized regardless of client clock drift.
export async function GET() {
  return NextResponse.json({ t: Date.now() });
}
