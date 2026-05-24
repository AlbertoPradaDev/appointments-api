import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const apiKey = searchParams.get("apiKey");

  if (!apiKey) {
    return NextResponse.json({ error: "ApiKey obligatoria" }, { status: 400 });
  }

  const negocio = await prisma.negocio.findUnique({
    where: { apiKey },
    select: { adminPassword: true },
  });

  if (!negocio) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    configurado: !!negocio.adminPassword,
  });
}