import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth";
import { createTradeIntent, getOrCreateDefaultPortfolio, listTradeIntents } from "@/lib/trading/trade-service";

export async function GET() {
  const user = await requireAuthUser();
  const intents = await listTradeIntents(user.companyId);
  return NextResponse.json({ tradeIntents: intents });
}

export async function POST(request: Request) {
  const user = await requireAuthUser();
  const body = (await request.json().catch(() => null)) as
    | { symbol?: string; side?: string; quantity?: number; notionalUsd?: number; leverage?: number; signalId?: string }
    | null;

  if (!body || typeof body.symbol !== "string" || !body.symbol.trim()) {
    return NextResponse.json({ error: "symbol is required." }, { status: 400 });
  }
  if (body.side !== "buy" && body.side !== "sell") {
    return NextResponse.json({ error: "side must be 'buy' or 'sell'." }, { status: 400 });
  }
  const quantity = Number(body.quantity);
  const notionalUsd = Number(body.notionalUsd);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "quantity must be a positive number." }, { status: 400 });
  }
  if (!Number.isFinite(notionalUsd) || notionalUsd <= 0) {
    return NextResponse.json({ error: "notionalUsd must be a positive number." }, { status: 400 });
  }
  const leverage = body.leverage === undefined ? 1 : Number(body.leverage);
  if (!Number.isFinite(leverage) || leverage <= 0) {
    return NextResponse.json({ error: "leverage must be a positive number." }, { status: 400 });
  }

  const portfolio = await getOrCreateDefaultPortfolio(user.companyId);
  try {
    const result = await createTradeIntent({
      companyId: user.companyId,
      actorUserId: user.id,
      actor: user.email,
      portfolioId: portfolio.id,
      symbol: body.symbol.trim().toUpperCase(),
      side: body.side,
      quantity,
      notionalUsd,
      leverage,
      source: body.signalId ? "signal" : "manual",
      signalId: body.signalId ?? null,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("invalid signalid")) {
      return NextResponse.json({ error: "signalId is invalid for this workspace." }, { status: 400 });
    }
    throw error;
  }
}
