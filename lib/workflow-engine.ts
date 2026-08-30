/**
 * lib/workflow-engine.ts
 *
 * Phase 5 of CAPABILITY_DEMOS_PLAN.md — the real pipeline behind
 * components/examples/IntegrationDemo.tsx (the "Backend Integrations"
 * capability card). A visitor pastes a webhook payload (Stripe, Shopify, or
 * a custom CRM lead) and this module runs it through four real,
 * synchronous steps:
 *
 *   1. Ingestion & Schema Validation — parse the JSON and detect which of
 *      the three shapes it matches (or fall back to generic field-sniffing).
 *   2. Field Mapping & Normalization — map each source's own field names
 *      onto one common record (e.g. Stripe's `amount_cents` -> dollars),
 *      sanitizing strings along the way.
 *   3. Condition Filtering — route the normalized record to a tier based on
 *      its amount, the same way a real automation would branch on deal size.
 *   4. Downstream Dispatch — generate the literal SQL `INSERT`, Slack Block
 *      Kit JSON, and Resend HTML email a production integration would send.
 *
 * Steps 1-3 are genuinely executed against whatever the visitor pastes in.
 * Step 4 is explicitly a *generation* step, not a dispatch — nothing here
 * opens a database connection or calls the Slack/Resend APIs. The UI labels
 * it as simulated so nobody mistakes the generated payloads for something
 * that was actually sent (STANDARDS.md / PROJECT_BLUEPRINT.md Section 8
 * Rule 2). Per-step `latencyMs` values are real `performance.now()` deltas
 * around that step's own work, not staged numbers.
 */

export type WebhookSource = "stripe" | "shopify" | "crm" | "unknown";
export type StepStatus = "ok" | "warning" | "error";
export type StepKey = "ingest" | "normalize" | "route" | "dispatch";
export type RouteTier = "enterprise" | "priority" | "standard";
export type DispatchChannel = "sql" | "slack" | "email";

export interface WorkflowStep {
  key: StepKey;
  status: StepStatus;
  latencyMs: number;
  messageKey: string;
  messageValues?: Record<string, string | number>;
  detail: unknown;
}

export interface NormalizedRecord {
  source: WebhookSource;
  eventType: string;
  customerName: string | null;
  customerEmail: string | null;
  company: string | null;
  amount: number | null;
  currency: string | null;
}

export interface RouteDecision {
  tier: RouteTier;
  messageKey: string;
  messageValues?: Record<string, string | number>;
}

export interface DispatchPayload {
  channel: DispatchChannel;
  content: string;
}

export interface WorkflowRun {
  valid: boolean;
  errorKey: string | null;
  source: WebhookSource;
  steps: WorkflowStep[];
  normalized: NormalizedRecord | null;
  route: RouteDecision | null;
  dispatches: DispatchPayload[];
  totalLatencyMs: number;
}

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function elapsed(start: number): number {
  return Math.round((now() - start) * 100) / 100;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function firstDefined(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
}

// --- Step 1: source detection -----------------------------------------

function detectSource(payload: Record<string, unknown>): WebhookSource {
  const dataObject = isRecord(payload.data) ? (payload.data as Record<string, unknown>).object : undefined;
  if (payload.object === "event" && typeof payload.type === "string" && isRecord(dataObject)) {
    return "stripe";
  }
  if (Array.isArray(payload.line_items) && ("total_price" in payload || "current_total_price" in payload)) {
    return "shopify";
  }
  if (isRecord(payload.lead) || (typeof payload.event === "string" && payload.event.startsWith("lead."))) {
    return "crm";
  }
  return "unknown";
}

// --- Step 2: field mapping & normalization -----------------------------

function normalizeStripe(payload: Record<string, unknown>): NormalizedRecord {
  const obj = (payload.data as Record<string, unknown>).object as Record<string, unknown>;
  const billing = isRecord(obj.billing_details) ? (obj.billing_details as Record<string, unknown>) : {};
  const amountCents = toNumber(obj.amount);
  return {
    source: "stripe",
    eventType: typeof payload.type === "string" ? payload.type : "unknown",
    customerName: sanitizeString(billing.name),
    customerEmail: sanitizeString(obj.receipt_email) ?? sanitizeString(billing.email),
    company: null,
    amount: amountCents !== null ? Math.round(amountCents) / 100 : null,
    currency: typeof obj.currency === "string" ? obj.currency.toUpperCase() : null,
  };
}

function normalizeShopify(payload: Record<string, unknown>): NormalizedRecord {
  const customer = isRecord(payload.customer) ? (payload.customer as Record<string, unknown>) : {};
  const name = [sanitizeString(customer.first_name), sanitizeString(customer.last_name)].filter(Boolean).join(" ");
  return {
    source: "shopify",
    eventType: "orders/create",
    customerName: name.length > 0 ? name : null,
    customerEmail: sanitizeString(payload.email) ?? sanitizeString(customer.email),
    company: null,
    amount: toNumber(payload.total_price ?? payload.current_total_price),
    currency: typeof payload.currency === "string" ? payload.currency.toUpperCase() : null,
  };
}

function normalizeCrm(payload: Record<string, unknown>): NormalizedRecord {
  const lead = isRecord(payload.lead) ? (payload.lead as Record<string, unknown>) : payload;
  return {
    source: "crm",
    eventType: typeof payload.event === "string" ? payload.event : "lead.created",
    customerName: sanitizeString(lead.name),
    customerEmail: sanitizeString(lead.email),
    company: sanitizeString(lead.company),
    amount: toNumber(lead.dealValue),
    currency: typeof lead.currency === "string" ? lead.currency.toUpperCase() : "USD",
  };
}

function normalizeUnknown(payload: Record<string, unknown>): NormalizedRecord {
  const eventType =
    (typeof payload.type === "string" && payload.type) || (typeof payload.event === "string" && payload.event) || "unknown";
  return {
    source: "unknown",
    eventType,
    customerName: sanitizeString(firstDefined(payload, ["name", "customer_name", "full_name"])),
    customerEmail: sanitizeString(firstDefined(payload, ["email", "customer_email", "contact_email"])),
    company: sanitizeString(firstDefined(payload, ["company", "organization", "org"])),
    amount: toNumber(firstDefined(payload, ["amount", "total", "total_price", "value", "dealValue"])),
    currency: (() => {
      const currency = firstDefined(payload, ["currency"]);
      return typeof currency === "string" ? currency.toUpperCase() : null;
    })(),
  };
}

function normalize(source: WebhookSource, payload: Record<string, unknown>): NormalizedRecord {
  if (source === "stripe") return normalizeStripe(payload);
  if (source === "shopify") return normalizeShopify(payload);
  if (source === "crm") return normalizeCrm(payload);
  return normalizeUnknown(payload);
}

// --- Step 3: condition filtering ----------------------------------------

const ENTERPRISE_THRESHOLD = 500;
const PRIORITY_THRESHOLD = 100;

function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

function decideRoute(amount: number | null): RouteDecision {
  if (amount === null) {
    return { tier: "standard", messageKey: "routeNoAmount" };
  }
  if (amount > ENTERPRISE_THRESHOLD) {
    return {
      tier: "enterprise",
      messageKey: "routeEnterprise",
      messageValues: { amount: formatAmount(amount), threshold: ENTERPRISE_THRESHOLD },
    };
  }
  if (amount > PRIORITY_THRESHOLD) {
    return {
      tier: "priority",
      messageKey: "routePriority",
      messageValues: { amount: formatAmount(amount), threshold: PRIORITY_THRESHOLD },
    };
  }
  return { tier: "standard", messageKey: "routeStandard", messageValues: { amount: formatAmount(amount) } };
}

// --- Step 4: downstream dispatch payload generation ----------------------

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlValue(value: string | null): string {
  return value === null ? "NULL" : sqlString(value);
}

function tierLabel(tier: RouteTier): string {
  if (tier === "enterprise") return "Enterprise VIP";
  if (tier === "priority") return "Priority";
  return "Standard";
}

function buildDispatches(record: NormalizedRecord, route: RouteDecision): DispatchPayload[] {
  const receivedAt = new Date().toISOString();
  const amountText = record.amount !== null ? `${record.currency ?? ""} ${record.amount.toFixed(2)}`.trim() : "—";

  const sql = [
    "INSERT INTO leads (source, event_type, customer_name, customer_email, company, amount, currency, tier, received_at)",
    `VALUES (${sqlString(record.source)}, ${sqlString(record.eventType)}, ${sqlValue(record.customerName)}, ${sqlValue(
      record.customerEmail
    )}, ${sqlValue(record.company)}, ${record.amount ?? "NULL"}, ${sqlValue(record.currency)}, ${sqlString(
      route.tier
    )}, ${sqlString(receivedAt)});`,
  ].join("\n");

  const slack = JSON.stringify(
    {
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: `New ${tierLabel(route.tier)} — ${record.source}` },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Customer:*\n${record.customerName ?? "—"}` },
            { type: "mrkdwn", text: `*Email:*\n${record.customerEmail ?? "—"}` },
            { type: "mrkdwn", text: `*Amount:*\n${amountText}` },
            { type: "mrkdwn", text: `*Event:*\n${record.eventType}` },
          ],
        },
      ],
    },
    null,
    2
  );

  const email = `<div style="font-family: -apple-system, sans-serif; max-width: 480px;">
  <h2 style="margin:0 0 12px;">New ${tierLabel(route.tier)} Lead</h2>
  <table style="width:100%; font-size:14px; border-collapse:collapse;">
    <tr><td style="color:#666; padding:4px 12px 4px 0;">Source</td><td>${record.source}</td></tr>
    <tr><td style="color:#666; padding:4px 12px 4px 0;">Event</td><td>${record.eventType}</td></tr>
    <tr><td style="color:#666; padding:4px 12px 4px 0;">Name</td><td>${record.customerName ?? "—"}</td></tr>
    <tr><td style="color:#666; padding:4px 12px 4px 0;">Email</td><td>${record.customerEmail ?? "—"}</td></tr>
    <tr><td style="color:#666; padding:4px 12px 4px 0;">Amount</td><td>${amountText}</td></tr>
  </table>
</div>`;

  return [
    { channel: "sql", content: sql },
    { channel: "slack", content: slack },
    { channel: "email", content: email },
  ];
}

// --- Orchestration ---------------------------------------------------------

export function runWorkflow(input: string): WorkflowRun {
  const steps: WorkflowStep[] = [];

  const ingestStart = now();
  let payload: Record<string, unknown> | null = null;
  let errorKey: string | null = null;
  try {
    const parsed: unknown = JSON.parse(input);
    if (isRecord(parsed)) {
      payload = parsed;
    } else {
      errorKey = "notAnObject";
    }
  } catch {
    errorKey = "invalidJson";
  }

  if (errorKey || !payload) {
    steps.push({
      key: "ingest",
      status: "error",
      latencyMs: elapsed(ingestStart),
      messageKey: errorKey ?? "invalidJson",
      detail: null,
    });
    return {
      valid: false,
      errorKey,
      source: "unknown",
      steps,
      normalized: null,
      route: null,
      dispatches: [],
      totalLatencyMs: steps.reduce((sum, step) => sum + step.latencyMs, 0),
    };
  }

  const source = detectSource(payload);
  steps.push({
    key: "ingest",
    status: source === "unknown" ? "warning" : "ok",
    latencyMs: elapsed(ingestStart),
    messageKey: source === "unknown" ? "ingestUnknown" : "ingestOk",
    detail: payload,
  });

  const normalizeStart = now();
  const normalized = normalize(source, payload);
  const fieldCount = Object.entries(normalized).filter(
    ([key, value]) => key !== "source" && key !== "eventType" && value !== null
  ).length;
  steps.push({
    key: "normalize",
    status: "ok",
    latencyMs: elapsed(normalizeStart),
    messageKey: "normalizeOk",
    messageValues: { fieldCount },
    detail: normalized,
  });

  const routeStart = now();
  const route = decideRoute(normalized.amount);
  steps.push({
    key: "route",
    status: "ok",
    latencyMs: elapsed(routeStart),
    messageKey: route.messageKey,
    messageValues: route.messageValues,
    detail: route,
  });

  const dispatchStart = now();
  const dispatches = buildDispatches(normalized, route);
  steps.push({
    key: "dispatch",
    status: "ok",
    latencyMs: elapsed(dispatchStart),
    messageKey: "dispatchOk",
    messageValues: { count: dispatches.length },
    detail: dispatches.map((d) => d.channel),
  });

  return {
    valid: true,
    errorKey: null,
    source,
    steps,
    normalized,
    route,
    dispatches,
    totalLatencyMs: steps.reduce((sum, step) => sum + step.latencyMs, 0),
  };
}

// --- Sample payloads for the demo's preset buttons -------------------------

export const SAMPLE_STRIPE_PAYLOAD = JSON.stringify(
  {
    id: "evt_1PxampLe000000000000001",
    object: "event",
    type: "payment_intent.succeeded",
    data: {
      object: {
        id: "pi_3PxampLe000000000000001",
        object: "payment_intent",
        amount: 129900,
        currency: "usd",
        receipt_email: "jordan@acmehq.com",
        billing_details: { name: "Jordan Aguilar", email: "jordan@acmehq.com" },
      },
    },
  },
  null,
  2
);

export const SAMPLE_SHOPIFY_PAYLOAD = JSON.stringify(
  {
    id: 820982911946154500,
    email: "priya@example.com",
    total_price: "84.98",
    currency: "USD",
    financial_status: "paid",
    customer: { first_name: "Priya", last_name: "Nair", email: "priya@example.com" },
    line_items: [
      { name: "Canvas Tote — Natural", quantity: 1, price: "44.99" },
      { name: "Ceramic Mug — Sand", quantity: 2, price: "19.99" },
    ],
  },
  null,
  2
);

export const SAMPLE_CRM_PAYLOAD = JSON.stringify(
  {
    event: "lead.created",
    lead: {
      name: "Marcus Webb",
      email: "marcus@northstarlogistics.io",
      company: "Northstar Logistics",
      dealValue: 750,
      currency: "usd",
      source: "Contact Form",
    },
  },
  null,
  2
);
