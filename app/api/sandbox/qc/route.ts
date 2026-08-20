import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const sample = body.sample || "pcb-board-1";

    const samplesData: Record<string, any> = {
      "pcb-board-1": {
        status: "FAIL",
        confidence: 0.992,
        defectType: "Solder Bridging (Pins 14-15)",
        severity: "HIGH",
        latencyMs: 12.4,
        heatmapCoords: [
          { x: 180, y: 140, radius: 35, intensity: 0.95 },
          { x: 210, y: 145, radius: 25, intensity: 0.82 },
        ],
      },
      "pcb-board-clean": {
        status: "PASS",
        confidence: 0.998,
        defectType: "Nominal Geometry (Zero Anomaly)",
        severity: "NONE",
        latencyMs: 10.8,
        heatmapCoords: [],
      },
      "metal-stamping-2": {
        status: "FAIL",
        confidence: 0.978,
        defectType: "Micro-Fracture / Surface Scratch >= 0.25mm",
        severity: "MEDIUM",
        latencyMs: 14.1,
        heatmapCoords: [{ x: 310, y: 220, radius: 45, intensity: 0.88 }],
      },
    };

    const result = samplesData[sample] || {
      status: "PASS",
      confidence: 0.985,
      defectType: "No Critical Anomaly Detected",
      severity: "NONE",
      latencyMs: 11.5,
      heatmapCoords: [],
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "QC Inference failed" },
      { status: 500 }
    );
  }
}
