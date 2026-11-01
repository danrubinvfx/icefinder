import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, sessionKey, sessionTitle, facilityName, startTime, bookingUrl } = body;

    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 },
      );
    }

    if (!sessionKey || !sessionTitle || !facilityName || !startTime) {
      return NextResponse.json(
        { error: "Missing required session details." },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const parsedStartTime = new Date(startTime);

    if (isNaN(parsedStartTime.getTime())) {
      return NextResponse.json(
        { error: "Invalid start time provided." },
        { status: 400 },
      );
    }

    // Prevent duplicate pending alerts for the same email and sessionKey
    const existing = await prisma.alertSubscription.findFirst({
      where: {
        email: normalizedEmail,
        sessionKey,
        status: "pending",
      },
    });

    if (!existing) {
      await prisma.alertSubscription.create({
        data: {
          email: normalizedEmail,
          sessionKey,
          sessionTitle,
          facilityName,
          startTime: parsedStartTime,
          bookingUrl: bookingUrl || null,
          status: "pending",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Alert registered! We'll email you the moment a spot opens up.",
    });
  } catch (err) {
    console.error("[IceFinder] Alert subscription error:", err);
    return NextResponse.json(
      { error: "Failed to register alert subscription." },
      { status: 500 },
    );
  }
}
