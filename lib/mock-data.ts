export interface MicroSprint {
  slug: string;
  title: string;
  subtitle: string;
  price: number;
  timelineHours: number;
  deliveryType: "Fixed-Scope Sprint" | "Managed Automation" | "Custom Deployment";
  category: "Scraping & Intelligence" | "Multi-Agent Systems" | "Computer Vision QA" | "Document Automation";
  badge?: string;
  description: string;
  deliverables: string[];
  prerequisites: string[];
  techStack: string[];
  sampleOutput: {
    format: string;
    description: string;
    metrics: string;
  };
}

export const MICRO_SPRINTS: MicroSprint[] = [
  {
    slug: "stealth-ai-scraper",
    title: "Stealth Headless Scraper Sprint",
    subtitle: "Custom Playwright crawler bypassing Cloudflare/DataDome with auto-schema JSON & CSV delivery.",
    price: 499,
    timelineHours: 48,
    deliveryType: "Fixed-Scope Sprint",
    category: "Scraping & Intelligence",
    badge: "Most Popular",
    description:
      "Engineered for founders and growth teams who need structured data from high-defense target platforms. Delivered as a containerized script with zero ongoing platform lock-in.",
    deliverables: [
      "Custom Playwright/Chromium stealth worker script",
      "Dynamic proxy rotation & fingerprint spoofing setup",
      "Auto-pagination & multi-page extraction engine",
      "Structured output export (CSV, JSON, PostgreSQL/Supabase webhook)",
      "Docker container + 1-click GitHub Actions automated cron runner",
    ],
    prerequisites: ["Target website URL and target data fields list", "Proxy provider credentials (optional, or we supply recommendations)"],
    techStack: ["Playwright", "TypeScript", "Docker", "Supabase", "GitHub Actions"],
    sampleOutput: {
      format: "CSV / JSON / Webhook",
      description: "Extracts 5,000+ SKU records per hour with 99.8% turnstile pass rate",
      metrics: "Average runtime 140s per 1,000 items",
    },
  },
  {
    slug: "multi-agent-triage-bot",
    title: "Multi-Agent Support & Lead Triage Bot",
    subtitle: "Autonomous LangChain/LangGraph agent routing customer tickets & scoring high-intent inbound leads.",
    price: 750,
    timelineHours: 48,
    deliveryType: "Fixed-Scope Sprint",
    category: "Multi-Agent Systems",
    badge: "High ROI",
    description:
      "Replaces 80% of manual first-response triage. Analyzes customer intent, queries internal docs via pgvector RAG, drafts context-aware replies, and escalates VIPs to Slack.",
    deliverables: [
      "Dual-agent LangGraph workflow (Intent Classifier + RAG Responder)",
      "Supabase pgvector embedding pipeline for company documentation",
      "Slack / Discord VIP alert webhook integration",
      "Confidence-threshold fallback router (hands off to human when <85%)",
      "Next.js admin monitoring panel with accuracy analytics",
    ],
    prerequisites: ["Export of FAQ/Knowledge Base docs (PDF, Markdown, or Notion)", "Slack Webhook or CRM API key"],
    techStack: ["LangGraph", "OpenAI / Claude API", "Supabase pgvector", "Next.js", "Slack API"],
    sampleOutput: {
      format: "Autonomous Slack / CRM Engine",
      description: "Resolves 65% of Tier-1 queries instantly; drafts 90% of complex responses",
      metrics: "< 3.2s median response latency",
    },
  },
  {
    slug: "industrial-vision-qa-sprint",
    title: "Edge Vision Defect Classifier Sprint",
    subtitle: "Turnkey YOLOv8 or PatchCore model trained on 100+ sample images for automated defect rejection.",
    price: 1200,
    timelineHours: 48,
    deliveryType: "Fixed-Scope Sprint",
    category: "Computer Vision QA",
    badge: "Enterprise Grade",
    description:
      "Designed for manufacturing workshops, 3D printing labs, and packaging lines. Delivers a fine-tuned edge model detecting surface flaws, misalignment, and dimensional errors.",
    deliverables: [
      "Fine-tuned YOLOv8 / PatchCore anomaly detection model weights",
      "TensorRT / ONNX export optimized for NVIDIA Jetson or local GPU",
      "Python FastAPI inference server with bounding box & heatmap generator",
      "Web-based operator review dashboard with pass/fail visual logs",
      "Modbus / TCP trigger integration guide for industrial actuators",
    ],
    prerequisites: ["50–100 sample images (both good and defective parts)", "Specification of target defect types"],
    techStack: ["PyTorch", "YOLOv8", "TensorRT", "FastAPI", "OpenCV"],
    sampleOutput: {
      format: "ONNX / TensorRT Engine + Web Dashboard",
      description: "Identifies scratches, pinholes, and cracks >= 0.2mm in real time",
      metrics: "12ms inference on NVIDIA RTX / Jetson Orin",
    },
  },
];

export const ENTERPRISE_CASE_STUDIES = [
  {
    id: "auto-logistics-alpr",
    title: "Tier-1 Automotive Port Logistics ALPR Engine",
    client: "Global Logistics Terminal",
    industry: "Maritime & Intermodal Freight",
    challenge:
      "Manual gate logging of incoming intermodal freight trucks caused 14-minute average truck queue times and a 6.2% error rate on OCR container tracking numbers under severe weather and nighttime glare.",
    solution:
      "Engineered edge TensorRT inference pipelines running dual YOLOv8-LPR and CRNN models directly on industrial IP cameras, integrated with port TOS via OPC UA and Kafka message streams.",
    metrics: [
      { label: "Gate Queue Time", before: "14.2 min", after: "45 sec", change: "-94.7%" },
      { label: "Recognition Accuracy", before: "93.8%", after: "99.4%", change: "+5.6%" },
      { label: "Night/Rain Robustness", before: "81.2%", after: "98.9%", change: "+17.7%" },
      { label: "Annual Labor Savings", before: "$0", after: "$380,000", change: "Sustained" },
    ],
    architecture: ["NVIDIA Jetson AGX Orin", "TensorRT 8.6", "CRNN OCR", "OPC UA / Kafka", "Next.js Fleet Dashboard"],
  },
  {
    id: "pcb-defect-patchcore",
    title: "Sub-Millimeter PCB SMT Solder Defect Detection",
    client: "High-Reliability Electronics Manufacturer",
    industry: "Semiconductor & SMT Assembly",
    challenge:
      "Automated Optical Inspection (AOI) machines produced high false-positive rates (18.4%), forcing 4 full-time quality inspectors to manually review boards under microscopes at line speeds.",
    solution:
      "Deployed a PatchCore memory-bank unsupervised anomaly detection pipeline detecting bridging, insufficient solder, and tombstoning at 12ms per quadrant with 0.1mm resolution.",
    metrics: [
      { label: "False Positive Escape", before: "18.4%", after: "1.1%", change: "-94.0%" },
      { label: "Line Inspection Speed", before: "1.8 sec/board", after: "0.22 sec/board", change: "8.1x Faster" },
      { label: "Defect Recall Rate", before: "96.2%", after: "99.92%", change: "+3.72%" },
    ],
    architecture: ["PatchCore PyTorch", "ONNX Runtime GPU", "Basler GigE Vision", "Modbus PLC Rejection Arm"],
  },
  {
    id: "document-layoutlm-financial",
    title: "Multi-Modal LayoutLM Commercial Invoice Reconciliation",
    client: "Enterprise Supply Chain Freight Brokerage",
    industry: "Logistics Finance & Customs Clearance",
    challenge:
      "Over 45,000 multi-page customs declarations and cross-border invoices per month required manual keying and math reconciliation, resulting in 72-hour invoice approval cycles.",
    solution:
      "Built a multi-modal LayoutLMv3 pipeline extracting hierarchical tables, cross-referencing tariff codes against customs APIs, and executing automatic mathematical reconciliation.",
    metrics: [
      { label: "Processing Latency", before: "72 hours", after: "3.4 seconds", change: "-99.9%" },
      { label: "Math Error Flags Caught", before: "82.0%", after: "100%", change: "Zero Leakage" },
      { label: "Cost Per Document", before: "$4.80", after: "$0.09", change: "-98.1%" },
    ],
    architecture: ["LayoutLMv3", "FastAPI Python", "Supabase PostgreSQL", "pgvector", "Stripe Connect"],
  },
];
