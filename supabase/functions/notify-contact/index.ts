// Supabase Edge Function: notify-contact
// -----------------------------------------------------------------------------
// Sends Erin an EMAIL (via Resend) and a TEXT (via Twilio) whenever a new row
// is inserted into public.contact_submissions. Wire it up with a Database
// Webhook (Database → Webhooks) on INSERT of contact_submissions that calls
// this function. Each channel only fires if its secrets are set, so you can
// turn on email first and add texting later.
//
// Required secrets (Edge Functions → Manage secrets):
//   ALERT_EMAIL          where to email you (e.g. erin@riveracedesigns.com)
//   RESEND_API_KEY       from resend.com
//   RESEND_FROM          verified sender, or leave unset to use onboarding@resend.dev
//   ALERT_PHONE          your cell in +E.164 form (e.g. +19495551234)
//   TWILIO_ACCOUNT_SID   from twilio.com
//   TWILIO_AUTH_TOKEN    from twilio.com
//   TWILIO_FROM          your Twilio phone number (+1...)
// -----------------------------------------------------------------------------

interface ContactRow {
  first_name?: string; last_name?: string; email?: string; phone?: string;
  interest?: string; message?: string;
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const r: ContactRow = payload.record ?? payload; // DB webhook wraps row in { record }

    const name = `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || "Someone";
    const body =
      `New website inquiry from ${name}\n\n` +
      `Email:    ${r.email ?? "—"}\n` +
      `Phone:    ${r.phone ?? "—"}\n` +
      `Interest: ${r.interest ?? "—"}\n\n` +
      `${r.message ?? ""}`;

    const tasks: Promise<unknown>[] = [];

    // ---- EMAIL (Resend) ----
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const ALERT_EMAIL = Deno.env.get("ALERT_EMAIL");
    const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "onboarding@resend.dev";
    if (RESEND_API_KEY && ALERT_EMAIL) {
      tasks.push(fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `Erin Uken Website <${RESEND_FROM}>`,
          to: [ALERT_EMAIL],
          reply_to: r.email || undefined,
          subject: `New website inquiry from ${name}`,
          text: body,
        }),
      }));
    }

    // ---- TEXT (Twilio) ----
    const SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const FROM = Deno.env.get("TWILIO_FROM");
    const ALERT_PHONE = Deno.env.get("ALERT_PHONE");
    if (SID && TOKEN && FROM && ALERT_PHONE) {
      const sms = new URLSearchParams({
        To: ALERT_PHONE,
        From: FROM,
        Body: `New inquiry from ${name} (${r.interest ?? "general"}). ${r.email ?? ""} ${r.phone ?? ""}`.trim().slice(0, 320),
      });
      tasks.push(fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${SID}:${TOKEN}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: sms,
      }));
    }

    const results = await Promise.allSettled(tasks);
    return new Response(JSON.stringify({ ok: true, channels: results.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
