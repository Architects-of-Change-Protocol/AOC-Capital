import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { getPositionDetail, PositionDetailNotFoundError } from "@/lib/capital/position-detail-service";

type Params = { params: Promise<{ id: string }> };

/**
 * Read-only Position Detail & Lifecycle Timeline payload for a single paper
 * position. GET only — this route never reads a request body and never
 * mutates anything. See src/lib/capital/position-detail-service.ts for the
 * read-only aggregation.
 */
export async function GET(_request: Request, { params }: Params) {
  const user = await requireAuthUser();
  const { id } = await params;

  try {
    const detail = await getPositionDetail(user.companyId, id);
    return NextResponse.json(detail);
  } catch (error) {
    if (error instanceof PositionDetailNotFoundError) {
      return NextResponse.json({ error: "position not found" }, { status: 404 });
    }
    console.error("position-detail: failed to build position detail", error);
    return NextResponse.json({ error: "position detail failed" }, { status: 500 });
  }
}
