import { handlers } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  console.log("[nextauth] GET", request.nextUrl.pathname);
  return handlers.GET(request);
}

export async function POST(request: NextRequest) {
  console.log("[nextauth] POST", request.nextUrl.pathname);
  return handlers.POST(request);
}
