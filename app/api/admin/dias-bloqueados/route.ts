import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { verificarToken } from "../../../lib/admin-auth";

export async function GET(req: NextRequest) {
  const decoded = verificarToken(req);
  if (!decoded) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const hoy = new Date();

  const diasBloqueados = await prisma.diaBloqueado.findMany({
    where: {
      negocioId: decoded.negocioId,
      fecha: { gte: hoy },
    },
    orderBy: { fecha: "asc" },
  });

  return NextResponse.json({ diasBloqueados });
}

export async function POST(req: NextRequest) {
  const decoded = verificarToken(req);
  if (!decoded) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { fecha, motivo } = await req.json();

  if (!fecha) {
    return NextResponse.json({ error: "La fecha es obligatoria" }, { status: 400 });
  }

  const fechaDate = new Date(fecha);

  if (isNaN(fechaDate.getTime())) {
    return NextResponse.json({ error: "Formato de fecha inválido" }, { status: 400 });
  }

  const existente = await prisma.diaBloqueado.findFirst({
    where: { negocioId: decoded.negocioId, fecha: fechaDate },
  });

  if (existente) {
    return NextResponse.json({ error: "Ese día ya está bloqueado" }, { status: 409 });
  }

  const diaBloqueado = await prisma.diaBloqueado.create({
    data: { fecha: fechaDate, motivo: motivo ?? null, negocioId: decoded.negocioId },
  });

  return NextResponse.json({ mensaje: "Día bloqueado", diaBloqueado }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const decoded = verificarToken(req);
  if (!decoded) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Id obligatorio" }, { status: 400 });

  const dia = await prisma.diaBloqueado.findUnique({ where: { id: parseInt(id) } });

  if (!dia || dia.negocioId !== decoded.negocioId) {
    return NextResponse.json({ error: "Día no encontrado" }, { status: 404 });
  }

  await prisma.diaBloqueado.delete({ where: { id: parseInt(id) } });

  return NextResponse.json({ mensaje: "Día desbloqueado" });
}