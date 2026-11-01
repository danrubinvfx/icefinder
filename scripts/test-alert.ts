import { Resend } from "resend";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });

const testEmail = process.argv[2] || "danielrubin76@gmail.com";
const apiKey = process.env.RESEND_API_KEY;

console.log("=== Resend Email Delivery Test ===");
console.log(`Target Email: ${testEmail}`);
console.log(`RESEND_API_KEY configured: ${Boolean(apiKey)} (${apiKey ? apiKey.slice(0, 6) + "..." : "NOT SET"})`);

async function run() {
  if (!apiKey) {
    console.error("\n❌ Error: RESEND_API_KEY is not defined in .env or environment.");
    console.log("Please add RESEND_API_KEY=\"re_...\" to your .env file to enable live email delivery.");
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const fromAddress = process.env.RESEND_FROM_EMAIL || "IceFinder Alerts <alerts@icefinder.ca>";
    console.log(`Sending from: ${fromAddress}`);

    const result = await resend.emails.send({
      from: fromAddress,
      to: testEmail,
      subject: "⚡ Spot Opened: Adult Drop-in Hockey at Poirier Sport & Leisure Complex!",
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>⚡ Spot Drop Alert (Test)</h2>
          <p>This is a test notification verifying IceFinder's cancellation watcher delivery pipeline.</p>
          <p><strong>Arena:</strong> Poirier Sport & Leisure Complex</p>
          <p><strong>Status:</strong> 1 spot available</p>
        </div>
      `,
    });

    console.log("\nResend API Result:", JSON.stringify(result, null, 2));
    if (result.error) {
      console.error("\n❌ API Error:", result.error.message);
    } else {
      console.log("\n✅ Success! Email queued with Message ID:", result.data?.id);
    }
  } catch (err: any) {
    console.error("\n❌ Exception while sending email:", err.message || err);
  }
}

run();
