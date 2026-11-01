import { NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const VALID_ISSUE_TYPES = [
  "wrong_time",
  "wrong_link",
  "cancelled",
  "wrong_category",
  "other",
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionKey, sessionTitle, facilitySlug, startTime, issueType, details, reporterEmail } = body;

    // Validate incoming payload
    if (!sessionKey || !sessionTitle || !facilitySlug || !startTime || !issueType) {
      return NextResponse.json(
        { error: "Missing required fields: sessionKey, sessionTitle, facilitySlug, startTime, and issueType are required." },
        { status: 400 },
      );
    }

    if (typeof issueType !== "string" || !VALID_ISSUE_TYPES.includes(issueType)) {
      return NextResponse.json(
        { error: "Invalid issueType provided." },
        { status: 400 },
      );
    }

    const parsedStartTime = new Date(startTime);
    if (isNaN(parsedStartTime.getTime())) {
      return NextResponse.json(
        { error: "Invalid startTime provided." },
        { status: 400 },
      );
    }

    const userAgent = req.headers.get("user-agent") || null;

    // Insert the report into prisma.sessionReport
    const report = await prisma.sessionReport.create({
      data: {
        sessionKey: String(sessionKey),
        sessionTitle: String(sessionTitle),
        facilitySlug: String(facilitySlug),
        startTime: parsedStartTime,
        issueType,
        details: details ? String(details).trim() : null,
        reporterEmail: reporterEmail ? String(reporterEmail).trim() : null,
        userAgent,
        status: "open",
      },
    });

    // Send instant notification email using Resend (non-blocking try/catch)
    try {
      const resendApiKey = process.env.RESEND_API_KEY;
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        const fromAddress = process.env.RESEND_FROM_EMAIL || "IceFinder System <onboarding@resend.dev>";
        const submissionTimestamp = new Date().toISOString();

        await resend.emails.send({
          from: fromAddress,
          to: "danielrubin76@gmail.com",
          subject: `⚠️ Session Issue Reported: [${facilitySlug}] ${sessionTitle}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #0f172a; margin-top: 0;">⚠️ New Session Issue Reported</h2>
              <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; width: 140px; color: #64748b;">Facility:</td>
                  <td style="padding: 8px 0;">${facilitySlug}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Session:</td>
                  <td style="padding: 8px 0;"><strong>${sessionTitle}</strong> <span style="font-size: 12px; color: #94a3b8;">(${sessionKey})</span></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Start Time:</td>
                  <td style="padding: 8px 0;">${parsedStartTime.toISOString()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Issue Type:</td>
                  <td style="padding: 8px 0;"><span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-weight: 600;">${issueType}</span></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #64748b;">User Details:</td>
                  <td style="padding: 8px 0; white-space: pre-wrap;">${details || "None provided"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Reporter Contact:</td>
                  <td style="padding: 8px 0;">${reporterEmail || "Anonymous"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Submitted At:</td>
                  <td style="padding: 8px 0; font-size: 13px; color: #64748b;">${submissionTimestamp}</td>
                </tr>
              </table>
              <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
                Report ID: ${report.id} · IceFinder System Alert
              </div>
            </div>
          `,
        });
      } else {
        console.warn("[IceFinder] RESEND_API_KEY is not set. Issue report email skipped.");
      }
    } catch (emailErr) {
      console.error("[IceFinder] Resend notification failed (non-blocking):", emailErr);
    }

    return NextResponse.json({
      success: true,
      message: "Thank you for the report! We will investigate.",
    });
  } catch (err) {
    console.error("[IceFinder] Issue report error:", err);
    return NextResponse.json(
      { error: "Failed to submit report. Please try again." },
      { status: 500 },
    );
  }
}
