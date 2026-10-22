import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDailyCleaningSheet, upsertDailyCleaningDay } from "@/server/services/daily-cleaning.service";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthYear = searchParams.get("monthYear") || currentMonthYear;

    const data = await getDailyCleaningSheet(monthYear);
    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    console.error("Error fetching daily cleaning sheet:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch cleaning sheet" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { monthYear, dayOfMonth, doneBy } = body;

    if (!monthYear || !dayOfMonth || !doneBy) {
      return NextResponse.json({ error: "Month, Day, and Cleaner (Done By) are required." }, { status: 400 });
    }

    const record = await upsertDailyCleaningDay(body, user);
    return NextResponse.json({ success: true, record });
  } catch (err: any) {
    console.error("Error saving daily cleaning record:", err);
    return NextResponse.json({ error: err.message || "Failed to save cleaning record" }, { status: 500 });
  }
}
