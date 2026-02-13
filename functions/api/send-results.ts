export const onRequestPost: PagesFunction<{
  BREVO_API_KEY: string;
  BREVO_SENDER_EMAIL: string;
  BREVO_SENDER_NAME: string;
  TURNSTILE_SECRET_KEY: string;
  SITE_URL: string;
}> = async (context) => {
  try {
    const req = context.request;
    if (req.headers.get("content-type")?.includes("application/json") !== true) {
      return json({ ok: false, error: "Invalid content type." }, 400);
    }
    const body = await req.json().catch(() => null) as any;
    if (!body) return json({ ok: false, error: "Invalid JSON." }, 400);

    const email = String(body.email || "").trim();
    const consent = Boolean(body.consent);
    const tool = String(body.tool || "").trim();
    const payload = body.payload;
    const token = String(body.turnstileToken || "").trim();

    if (!consent) return json({ ok: false, error: "Consent is required." }, 400);
    if (!isEmail(email)) return json({ ok: false, error: "Enter a valid email." }, 400);
    if (!["interest","points","bt"].includes(tool)) return json({ ok: false, error: "Unknown tool." }, 400);

    // Turnstile verify
    const turnstileOk = await verifyTurnstile(token, context.env.TURNSTILE_SECRET_KEY, context.request);
    if (!turnstileOk) return json({ ok: false, error: "Verification failed. Please try again." }, 403);

    // Build email content
    const { subject, html } = buildEmail(tool, payload, context.env.SITE_URL);

    // Send via Brevo transactional API
    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": context.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: context.env.BREVO_SENDER_NAME, email: context.env.BREVO_SENDER_EMAIL },
        to: [{ email }],
        subject,
        htmlContent: html,
      }),
    });

    if (!brevoRes.ok) {
      const text = await brevoRes.text().catch(() => "");
      return json({ ok: false, error: "Email send failed.", detail: text.slice(0, 400) }, 500);
    }

    return json({ ok: true }, 200);
  } catch (err: any) {
    return json({ ok: false, error: "Server error." }, 500);
  }
};

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

async function verifyTurnstile(token: string, secret: string, req: Request): Promise<boolean> {
  if (!secret) return true; // allow local dev without Turnstile
  if (!token) return false;

  const ip = req.headers.get("CF-Connecting-IP") || req.headers.get("x-forwarded-for") || "";

  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);
  if (ip) form.set("remoteip", ip.split(",")[0].trim());

  const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });
  if (!resp.ok) return false;
  const data = await resp.json().catch(() => null) as any;
  return Boolean(data && data.success);
}

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" } as any)[c] || c);
}

function money(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

function num(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(v);
}

function buildEmail(tool: string, payload: any, siteUrl: string) {
  const safeUrl = siteUrl || "https://cardvaluelab.com";
  const base = (path: string) => `${safeUrl.replace(/\/$/,"")}${path}`;

  // Payload shape: {tool, inputs, outputs} or {tool, payload:{...}}
  const p = payload && payload.tool ? payload : (payload && payload.payload ? payload.payload : null);
  const inputs = p?.inputs || {};
  const outputs = p?.outputs || {};

  if (tool === "interest") {
    const subj = "Your Credit Card Interest Breakdown (CardValueLab)";
    const html = `
      <div style="font-family:Arial,sans-serif; line-height:1.5">
        <h2>Your Interest Breakdown</h2>
        <p><strong>Balance:</strong> ${money(inputs.balance)}<br/>
           <strong>APR:</strong> ${escapeHtml(String(inputs.apr || ""))}%<br/>
           <strong>Monthly payment:</strong> ${money(inputs.payment)}</p>
        ${outputs.feasible === false ? `
          <p style="color:#b91c1c"><strong>Warning:</strong> At this payment, your balance won't decrease.</p>
          <p>Minimum payment to reduce the balance: <strong>${money(outputs.minPaymentToReduce)}</strong></p>
        ` : `
          <p><strong>Payoff time:</strong> ${num(outputs.months)} months<br/>
             <strong>Total interest:</strong> ${money(outputs.totalInterest)}<br/>
             <strong>Total paid:</strong> ${money(outputs.totalPaid)}</p>
        `}
        <p>Re-run the calculator anytime: <a href="${base("/tools/interest-calculator/")}">${base("/tools/interest-calculator/")}</a></p>
        <p style="font-size:12px;color:#6b7280">Educational estimate only. Not financial advice.</p>
      </div>
    `;
    return { subject: subj, html };
  }

  if (tool === "points") {
    const subj = "Your Points Value Estimate (CardValueLab)";
    const html = `
      <div style="font-family:Arial,sans-serif; line-height:1.5">
        <h2>Your Points Value Estimate</h2>
        <p><strong>Points:</strong> ${num(inputs.points)}<br/>
           <strong>Assumed value:</strong> ${escapeHtml(String(inputs.cpp || ""))}¢ per point</p>
        <p><strong>Estimated value:</strong> ${money(outputs.value)}<br/>
           <strong>Typical range:</strong> ${money(outputs.low)} – ${money(outputs.high)}</p>
        <p>Re-run the calculator anytime: <a href="${base("/tools/points-value-calculator/")}">${base("/tools/points-value-calculator/")}</a></p>
        <p style="font-size:12px;color:#6b7280">Educational estimate only. Not financial advice.</p>
      </div>
    `;
    return { subject: subj, html };
  }

  // bt
  const subj = "Your Balance Transfer Savings Estimate (CardValueLab)";
  const html = `
    <div style="font-family:Arial,sans-serif; line-height:1.5">
      <h2>Your Balance Transfer Estimate</h2>
      <p><strong>Balance:</strong> ${money(inputs.balance)}<br/>
         <strong>Current APR:</strong> ${escapeHtml(String(inputs.aprCurrent || ""))}%<br/>
         <strong>Monthly payment:</strong> ${money(inputs.payment)}<br/>
         <strong>Promo months:</strong> ${escapeHtml(String(inputs.promoMonths || ""))}<br/>
         <strong>BT fee:</strong> ${escapeHtml(String(inputs.feePct || ""))}% (${money(outputs.feeAmount)})</p>
      <p><strong>Estimated savings after fee:</strong> ${money(outputs.savingsEstimate)}<br/>
         <strong>Remaining after promo:</strong> ${money(outputs.remainingAfterPromo)}</p>
      <p>Re-run the calculator anytime: <a href="${base("/tools/balance-transfer-savings/")}">${base("/tools/balance-transfer-savings/")}</a></p>
      <p style="font-size:12px;color:#6b7280">Educational estimate only. Not financial advice.</p>
    </div>
  `;
  return { subject: subj, html };
}
