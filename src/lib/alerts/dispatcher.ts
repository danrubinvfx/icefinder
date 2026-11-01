import { Resend } from "resend";
import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/db";
import { formatDayHeading, formatTime } from "@/lib/time";

export interface TransitionedSession {
  sessionKey: string;
  openSpots: number;
  bookingUrl: string;
}

/**
 * Dispatches notification emails when sessions transition from 0 spots to > 0 spots.
 */
export async function checkAndDispatchAlerts(
  transitionedSessions: TransitionedSession[],
  prismaClient?: PrismaClient,
): Promise<{ dispatched: number; failed: number }> {
  if (!transitionedSessions || transitionedSessions.length === 0) {
    return { dispatched: 0, failed: 0 };
  }

  const db = prismaClient ?? defaultPrisma;
  const apiKey = process.env.RESEND_API_KEY;
  const resend = apiKey ? new Resend(apiKey) : null;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "IceFinder Alerts <onboarding@resend.dev>";

  let dispatched = 0;
  let failed = 0;

  for (const session of transitionedSessions) {
    if (session.openSpots <= 0) continue;

    try {
      const pendingSubscriptions = await db.alertSubscription.findMany({
        where: {
          sessionKey: session.sessionKey,
          status: "pending",
        },
      });

      if (pendingSubscriptions.length === 0) continue;

      console.log(
        `[AlertDispatcher] Found ${pendingSubscriptions.length} pending alert(s) for session ${session.sessionKey} (${session.openSpots} spot(s) available)`,
      );

      for (const sub of pendingSubscriptions) {
        const targetUrl = session.bookingUrl || sub.bookingUrl || "https://icefinder.ca";
        const formattedDate = formatDayHeading(sub.startTime);
        const formattedTime = formatTime(sub.startTime);
        const subject = `⚡ Spot Opened: ${sub.sessionTitle} at ${sub.facilityName}!`;

        const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 24px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.025em;">⚡ Spot Drop Alert</h1>
      <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">A spot just opened up on IceFinder</p>
    </div>
    
    <div style="padding: 24px;">
      <h2 style="font-size: 18px; font-weight: 700; margin: 0 0 16px 0; color: #0f172a;">${sub.sessionTitle}</h2>
      
      <div style="background-color: #f1f5f9; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>🏟️ Arena:</strong> ${sub.facilityName}</p>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>📅 Date:</strong> ${formattedDate}</p>
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;"><strong>⏰ Start Time:</strong> ${formattedTime}</p>
        <p style="margin: 0; font-size: 14px; color: #059669; font-weight: 700;"><strong>🟢 Open Spots:</strong> ${session.openSpots} spot${session.openSpots === 1 ? "" : "s"} available now</p>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${targetUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 28px; border-radius: 12px; box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);">
          Claim Your Spot Now &rarr;
        </a>
      </div>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px;">
        <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
          ⚠️ <em>Notice: Spots are first-come, first-served on the city registration portal. Act quickly as drop-in spots fill fast.</em>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
        `.trim();

        if (resend) {
          try {
            await resend.emails.send({
              from: fromEmail,
              to: sub.email,
              subject,
              html: htmlBody,
            });
            console.log(`[AlertDispatcher] Notification email sent to ${sub.email}`);
          } catch (emailErr) {
            console.error(`[AlertDispatcher] Failed to send email via Resend to ${sub.email}:`, emailErr);
            failed++;
            continue;
          }
        } else {
          console.log(`[AlertDispatcher] (Fallback console log - RESEND_API_KEY not configured)`);
          console.log(`  To: ${sub.email}`);
          console.log(`  Subject: ${subject}`);
          console.log(`  Facility: ${sub.facilityName} | Start: ${formattedTime} | Spots: ${session.openSpots}`);
          console.log(`  Booking URL: ${targetUrl}`);
          console.log(`  Notice: Spots are first-come, first-served on the city registration portal.`);
        }

        // Mark alert as notified
        await db.alertSubscription.update({
          where: { id: sub.id },
          data: {
            status: "notified",
            notifiedAt: new Date(),
          },
        });

        dispatched++;
      }
    } catch (sessionErr) {
      console.error(`[AlertDispatcher] Error checking alerts for ${session.sessionKey}:`, sessionErr);
      failed++;
    }
  }

  return { dispatched, failed };
}
