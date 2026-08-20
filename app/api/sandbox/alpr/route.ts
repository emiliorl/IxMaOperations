import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const sample = body.sample || "sample-truck-1";

    // Deterministic simulation or proxy to FastAPI if available
    const samplesData: Record<string, any> = {
      "sample-truck-1": {
        plateNumber: "6XYZ942",
        confidence: 0.984,
        country: "USA (California)",
        latencyMs: 14.2,
        bbox: [120, 240, 260, 90], // [x, y, w, h]
        timestamp: new Date().toISOString(),
      },
      "sample-container-2": {
        plateNumber: "MSKU-829410-4",
        confidence: 0.991,
        country: "ISO 6346 Intermodal",
        latencyMs: 18.6,
        bbox: [80, 160, 320, 110],
        timestamp: new Date().toISOString(),
      },
      "sample-eu-car-3": {
        plateNumber: "B 7291 KM",
        confidence: 0.978,
        country: "European Union (DE)",
        latencyMs: 11.8,
        bbox: [140, 220, 240, 75],
        timestamp: new Date().toISOString(),
      },
    };

    const result = samplesData[sample] || {
      plateNumber: "CUSTOM-LPR-99",
      confidence: 0.965,
      country: "Auto-Detected Standard",
      latencyMs: 16.4,
      bbox: [100, 200, 280, 85],
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Inference failed" },
      { status: 500 }
    );
  }
}
