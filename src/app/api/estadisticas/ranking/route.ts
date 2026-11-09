import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth"
import { buildRanking } from "@/lib/stats"

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const q = req.nextUrl.searchParams.get("q")?.toLowerCase() || ""
  let items = await buildRanking(user)
  if (q) items = items.filter((r) => r.name.toLowerCase().includes(q))
  return NextResponse.json({ items })
}
