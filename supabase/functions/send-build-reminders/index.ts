/**
 * Hourly reminder for stalled book builds (invoked by pg_cron).
 *
 * A "stalled build" is a draft order whose visitor saved their email in the
 * builder, uploaded at least one photo, and then went quiet for 4+ hours.
 * One email per builder session, ever — reminder_sent_at marks it done, so
 * re-runs and overlapping invocations can't spam anyone.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const QUIET_HOURS = 4;      // inactivity before we nudge
const MAX_AGE_DAYS = 14;    // don't email about builds older than this
const BATCH_LIMIT = 20;     // sessions per run

function buildReminderHtml(resumeUrl: string, siteUrl: string, photoCount: number): string {
  const photoLine = photoCount === 1 ? "the photo you uploaded is" : `your ${photoCount} photos are`;
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your book is waiting</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:'Poppins',Helvetica,Arial,sans-serif;color:#1c1c1c;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <img src="${siteUrl}/images/piccoload-logo-large.png" alt="Piccoload" width="140" style="display:block;" />
            </td>
          </tr>
          <tr>
            <td style="background-color:#faf8f5;border-radius:16px;padding:40px 32px;text-align:center;">
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:600;color:#1c1c1c;">
                Your colouring book is waiting 🖍️
              </h1>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#555;">
                You made a great start — ${photoLine} saved and ready.
                It only takes a couple of minutes to finish your book.
              </p>
              <a href="${resumeUrl}" target="_blank"
                 style="display:inline-block;background-color:#1c1c1c;color:#ffffff;font-size:16px;font-weight:600;padding:14px 36px;border-radius:9999px;text-decoration:none;">
                Finish My Book
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-top:32px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#999;line-height:1.5;">
                You're receiving this one-off reminder because you saved a book on Piccoload.<br/>
                If you have any questions, reply to this email — we're happy to help!
              </p>
              <p style="margin:16px 0 0;font-size:12px;color:#ccc;">
                © ${new Date().getFullYear()} Piccolo. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not set");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const fromEmail = Deno.env.get("FROM_EMAIL") || "Piccoload <hello@piccoload.com>";
    const siteUrl = Deno.env.get("SITE_URL") || "https://piccoload.com";

    const now = Date.now();
    const oldestIso = new Date(now - MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const quietCutoff = now - QUIET_HOURS * 60 * 60 * 1000;

    const { data: candidates, error: candErr } = await supabase
      .from("orders")
      .select("id, builder_session_id, customer_email, created_at, updated_at")
      .eq("status", "draft")
      .not("customer_email", "is", null)
      .is("reminder_sent_at", null)
      .gte("created_at", oldestIso);
    if (candErr) throw candErr;

    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by session — one email per visitor, not per book
    const sessions = new Map<string, { email: string; orderIds: string[]; lastActivity: number }>();
    for (const o of candidates) {
      if (!o.builder_session_id || !o.customer_email) continue;
      const s = sessions.get(o.builder_session_id) ?? {
        email: o.customer_email,
        orderIds: [],
        lastActivity: 0,
      };
      s.orderIds.push(o.id);
      s.lastActivity = Math.max(
        s.lastActivity,
        new Date(o.updated_at || o.created_at).getTime(),
      );
      sessions.set(o.builder_session_id, s);
    }

    let sent = 0;
    for (const [sessionId, s] of sessions) {
      if (sent >= BATCH_LIMIT) break;

      // Photo uploads count as activity too, and no photos = nothing to save
      const { data: photos } = await supabase
        .from("order_photos")
        .select("created_at")
        .in("order_id", s.orderIds)
        .order("created_at", { ascending: false })
        .limit(200);
      const photoCount = photos?.length ?? 0;
      if (photoCount === 0) continue;
      const lastPhoto = photos?.[0] ? new Date(photos[0].created_at).getTime() : 0;
      const lastActivity = Math.max(s.lastActivity, lastPhoto);
      if (lastActivity > quietCutoff) continue; // still active — leave them be

      // Claim before sending so a concurrent run can't email twice
      const { data: claimed, error: claimErr } = await supabase
        .from("orders")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("builder_session_id", sessionId)
        .eq("status", "draft")
        .is("reminder_sent_at", null)
        .select("id");
      if (claimErr || !claimed || claimed.length === 0) continue;

      const resumeUrl = `${siteUrl}/builder?sessionId=${sessionId}`;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [s.email],
          subject: "Your Piccolo colouring book is waiting for you 🖍️",
          html: buildReminderHtml(resumeUrl, siteUrl, photoCount),
        }),
      });
      if (!res.ok) {
        console.error("Reminder email failed:", res.status, await res.text());
        // Un-claim so the next run retries
        await supabase
          .from("orders")
          .update({ reminder_sent_at: null })
          .in("id", claimed.map((c: { id: string }) => c.id));
        continue;
      }
      console.log("Build reminder sent to", s.email, "session", sessionId);
      sent++;
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-build-reminders error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
