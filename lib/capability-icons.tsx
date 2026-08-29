/**
 * lib/capability-icons.tsx
 *
 * Shared lucide-react icon lookup for `lib/capabilities.ts`'s `icon` field —
 * factored out of `CapabilityStrip.tsx` (Stage 9) so `ProjectEstimatorWizard`
 * (Stage 14) can reuse the same mapping instead of duplicating it.
 */
import { Search, Receipt, FileVideo, ShieldCheck, Workflow, Eye, type LucideIcon } from "lucide-react";

export const CAPABILITY_ICONS: Record<string, LucideIcon> = {
  Search,
  Receipt,
  FileVideo,
  ShieldCheck,
  Workflow,
  Eye,
};
