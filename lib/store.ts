import { create } from "zustand";

export interface AlprResult {
  plateNumber: string;
  confidence: number;
  country: string;
  latencyMs: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
  timestamp: string;
}

export interface DefectResult {
  status: "PASS" | "FAIL";
  confidence: number;
  defectType: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "NONE";
  latencyMs: number;
  heatmapCoords: Array<{ x: number; y: number; radius: number; intensity: number }>;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  confidence: number;
  verified: boolean;
}

export interface InvoiceResult {
  invoiceNumber: string;
  vendorName: string;
  invoiceDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  mathValidated: boolean;
  ocrConfidence: number;
}

export interface ScraperLog {
  id: string;
  timestamp: string;
  level: "INFO" | "SUCCESS" | "WARN" | "ERROR";
  message: string;
  stealthBypass?: boolean;
}

export interface OnboardingState {
  orderId: string;
  clientEmail: string;
  toolSlug: string;
  loomUrl: string;
  workflowNotes: string;
  vaultStatus: "unsubmitted" | "encrypting" | "stored";
  vaultCiphertext: string;
  vaultIv: string;
}

interface AppStore {
  // Sandbox Active States
  activeSandboxTab: "alpr" | "qc" | "invoice" | "scrape";
  setActiveSandboxTab: (tab: "alpr" | "qc" | "invoice" | "scrape") => void;

  // ALPR Sandbox
  alprSample: string;
  alprResult: AlprResult | null;
  alprLoading: boolean;
  setAlprSample: (sample: string) => void;
  setAlprResult: (res: AlprResult | null) => void;
  setAlprLoading: (loading: boolean) => void;

  // Defect QC Sandbox
  qcSample: string;
  qcResult: DefectResult | null;
  qcLoading: boolean;
  setQcSample: (sample: string) => void;
  setQcResult: (res: DefectResult | null) => void;
  setQcLoading: (loading: boolean) => void;

  // Invoice Sandbox
  invoiceResult: InvoiceResult | null;
  invoiceLoading: boolean;
  setInvoiceResult: (res: InvoiceResult | null) => void;
  setInvoiceLoading: (loading: boolean) => void;

  // Scraper Terminal Sandbox
  isScraping: boolean;
  scraperLogs: ScraperLog[];
  scraperStats: { pagesScraped: number; itemsExtracted: number; proxiesRotated: number };
  addScraperLog: (log: ScraperLog) => void;
  clearScraperLogs: () => void;
  setIsScraping: (val: boolean) => void;
  setScraperStats: (stats: { pagesScraped: number; itemsExtracted: number; proxiesRotated: number }) => void;

  // Feasibility Modal State
  feasibilityModalOpen: boolean;
  setFeasibilityModalOpen: (open: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  activeSandboxTab: "alpr",
  setActiveSandboxTab: (tab) => set({ activeSandboxTab: tab }),

  alprSample: "sample-truck-1",
  alprResult: null,
  alprLoading: false,
  setAlprSample: (sample) => set({ alprSample: sample }),
  setAlprResult: (res) => set({ alprResult: res }),
  setAlprLoading: (loading) => set({ alprLoading: loading }),

  qcSample: "pcb-board-1",
  qcResult: null,
  qcLoading: false,
  setQcSample: (sample) => set({ qcSample: sample }),
  setQcResult: (res) => set({ qcResult: res }),
  setQcLoading: (loading) => set({ qcLoading: loading }),

  invoiceResult: null,
  invoiceLoading: false,
  setInvoiceResult: (res) => set({ invoiceResult: res }),
  setInvoiceLoading: (loading) => set({ invoiceLoading: loading }),

  isScraping: false,
  scraperLogs: [],
  scraperStats: { pagesScraped: 0, itemsExtracted: 0, proxiesRotated: 0 },
  addScraperLog: (log) => set((state) => ({ scraperLogs: [...state.scraperLogs, log] })),
  clearScraperLogs: () => set({ scraperLogs: [], scraperStats: { pagesScraped: 0, itemsExtracted: 0, proxiesRotated: 0 } }),
  setIsScraping: (val) => set({ isScraping: val }),
  setScraperStats: (stats) => set({ scraperStats: stats }),

  feasibilityModalOpen: false,
  setFeasibilityModalOpen: (open) => set({ feasibilityModalOpen: open }),
}));
