import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  const items = await db.tipoArea.findMany({ orderBy: { nombre: "asc" } })
  return NextResponse.json({ items })
}
