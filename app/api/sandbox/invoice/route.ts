import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const sample = body.sample || "invoice-logistics-1";

    const result = {
      invoiceNumber: "INV-2026-88914",
      vendorName: "Apex Logistics Global Corp",
      invoiceDate: "2026-08-14",
      dueDate: "2026-09-14",
      items: [
        {
          id: "item-1",
          description: "Intermodal Container Drayage (40ft HQ)",
          quantity: 3,
          unitPrice: 1250.0,
          total: 3750.0,
          confidence: 0.994,
          verified: true,
        },
        {
          id: "item-2",
          description: "Port Chassis Triaxle Daily Rental (x7 Days)",
          quantity: 7,
          unitPrice: 65.0,
          total: 455.0,
          confidence: 0.988,
          verified: true,
        },
        {
          id: "item-3",
          description: "Customs Security Filing & ISF Bond Fee",
          quantity: 1,
          unitPrice: 180.0,
          total: 180.0,
          confidence: 0.997,
          verified: true,
        },
        {
          id: "item-4",
          description: "Terminal Fuel Surcharge (Index 14.2%)",
          quantity: 1,
          unitPrice: 342.5,
          total: 342.5,
          confidence: 0.981,
          verified: true,
        },
      ],
      subtotal: 4727.5,
      tax: 378.2,
      total: 5105.7,
      mathValidated: true,
      ocrConfidence: 0.991,
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Invoice parse failed" },
      { status: 500 }
    );
  }
}
