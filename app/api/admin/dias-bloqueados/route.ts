import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { verificarToken } from "../../../lib/admin-auth";

export async function GET(req: NextRequest) {
  const decoded = verificarToken(req);
  if (!decoded) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const empleadoId = searchParams.get("empleadoId");

  if (!empleadoId) {
    return NextResponse.json({ error: "empleadoId é obrigatório" }, { status: 400 });
  }

  const empleado = await prisma.empleado.findUnique({ where: { id: parseInt(empleadoId) } });

  if (!empleado || empleado.negocioId !== decoded.negocioId) {
    return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });
  }

  const diasBloqueados = await prisma.diaBloqueado.findMany({
    where: { empleadoId: empleado.id, fecha: { gte: new Date() } },
    orderBy: { fecha: "asc" },
  });

  return NextResponse.json({ diasBloqueados });
}

export async function POST(req: NextRequest) {
  const decoded = verificarToken(req);
  if (!decoded) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { fecha, motivo, empleadoId } = await req.json();

  if (!fecha || !empleadoId) {
    return NextResponse.json({ error: "A data e empleadoId são obrigatórios" }, { status: 400 });
  }

  const fechaDate = new Date(fecha);

  if (isNaN(fechaDate.getTime())) {
    return NextResponse.json({ error: "Formato de data inválido" }, { status: 400 });
  }

  const empleado = await prisma.empleado.findUnique({ where: { id: parseInt(empleadoId) } });

  if (!empleado || empleado.negocioId !== decoded.negocioId) {
    return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });
  }

  const existente = await prisma.diaBloqueado.findFirst({
    where: { empleadoId: empleado.id, fecha: fechaDate },
  });

  if (existente) {
    return NextResponse.json({ error: "Esse dia já está bloqueado" }, { status: 409 });
  }

  const diaBloqueado = await prisma.diaBloqueado.create({
    data: { fecha: fechaDate, motivo: motivo ?? null, empleadoId: empleado.id },
  });

  return NextResponse.json({ mensaje: "Dia bloqueado", diaBloqueado }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const decoded = verificarToken(req);
  if (!decoded) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Id obrigatório" }, { status: 400 });

  const dia = await prisma.diaBloqueado.findUnique({
    where: { id: parseInt(id) },
    include: { empleado: true },
  });

  if (!dia || dia.empleado.negocioId !== decoded.negocioId) {
    return NextResponse.json({ error: "Dia não encontrado" }, { status: 404 });
  }

  await prisma.diaBloqueado.delete({ where: { id: parseInt(id) } });

  return NextResponse.json({ mensaje: "Dia desbloqueado" });
}
