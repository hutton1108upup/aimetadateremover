import { readFileSync, existsSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomUUID } from "node:crypto";

const args = process.argv.slice(2);
if (args.some(arg => arg !== "--send")) throw new Error("Usage: npm run feedback:mail-test [-- --send]");
const local = existsSync(".dev.vars") ? parseEnv(readFileSync(".dev.vars", "utf8")) : {};
const env = { ...local, ...process.env };
const required = ["RESEND_API_KEY", "FEEDBACK_FROM", "FEEDBACK_TO"];
const missing = required.filter(key => !env[key]?.trim());
const validEmail = value => typeof value === "string" && value.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
if (missing.length) {
  console.error("NOT READY: add these server-only values to .dev.vars: " + missing.join(", "));
  console.error("Nothing sent. Do not paste API keys into chat or commit .dev.vars.");
  process.exitCode = 1;
} else if (!validEmail(env.FEEDBACK_FROM) || !validEmail(env.FEEDBACK_TO)) {
  console.error("NOT READY: FEEDBACK_FROM and FEEDBACK_TO must be plain email addresses.");
  process.exitCode = 1;
} else if (!args.includes("--send")) {
  console.log("PASS: mail settings are present and addresses are valid. No network request made; domain verification and inbox delivery are not yet tested.");
  console.log("To send one synthetic test to FEEDBACK_TO: npm run feedback:mail-test -- --send");
} else {
  const reference = randomUUID();
  try {
    const result = await fetch("https://api.resend.com/emails", {
      method: "POST", signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY.trim()}`, "Content-Type": "application/json", "Idempotency-Key": `feedback-setup/${reference}` },
      body: JSON.stringify({ from: env.FEEDBACK_FROM, to: [env.FEEDBACK_TO], subject: "[ImageFinisher] Feedback delivery setup test", text: `This is a synthetic setup test. No visitor data is included.\nReference: ${reference}\nIf you can read this in your receiving mailbox, this test reached the mailbox.` }),
    });
    if (!result.ok) throw new Error(`Provider rejected the test (HTTP ${result.status}). Check the verified sender domain and API-key permissions in Resend.`);
    const data = await result.json();
    if (typeof data.id !== "string") throw new Error("Provider returned an unexpected response; check Resend logs before sending another test.");
    console.log(`ACCEPTED by provider. Test reference: ${reference}; provider ID: ${data.id}`);
    console.log("Now verify that exact reference in the receiving mailbox, including Spam. API acceptance alone does not prove inbox delivery.");
  } catch (error) {
    console.error(error.name === "TimeoutError" ? "Test result uncertain: check Resend logs and the inbox before trying again." : error.message);
    process.exitCode = 1;
  }
}
