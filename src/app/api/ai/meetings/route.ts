import { NextResponse } from "next/server";
import { runAIModule } from "@/lib/ai/gateway";

export async function GET() {
  const response = await runAIModule({
    moduleId: "meetings",
    input: {},
    context: {},
  });

  return NextResponse.json(response);
}
