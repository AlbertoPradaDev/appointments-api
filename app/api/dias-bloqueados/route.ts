import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { verificarApiKey } from "../../lib/auth";

export async function POST(req: NextRequest) {
  const { error, status, negocio } = await verificarApiKey(req);
  if (error) return NextResponse.json({ error }, { status });

  const { fecha, motivo, empleadoId } = await req.json();

  if (!fecha || !empleadoId) {
    return NextResponse.json({ error: "A data e empleadoId são obrigatórios" }, { status: 400 });
  }

  const fechaDate = new Date(fecha);

  if (isNaN(fechaDate.getTime())) {
    return NextResponse.json(
      { error: "Formato de data inválido. Use YYYY-MM-DD, exemplo: 2026-12-25" },
      { status: 400 }
    );
  }

  const empleado = await prisma.empleado.findUnique({ where: { id: parseInt(empleadoId) } });

  if (!empleado || empleado.negocioId !== negocio!.id) {
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

  return NextResponse.json({ mensaje: "Dia bloqueado com sucesso", diaBloqueado }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const { error, status, negocio } = await verificarApiKey(req);
  if (error) return NextResponse.json({ error }, { status });

  const { searchParams } = new URL(req.url);
  const empleadoId = searchParams.get("empleadoId");

  if (!empleadoId) {
    return NextResponse.json({ error: "empleadoId é obrigatório" }, { status: 400 });
  }

  const empleado = await prisma.empleado.findUnique({ where: { id: parseInt(empleadoId) } });

  if (!empleado || empleado.negocioId !== negocio!.id) {
    return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });
  }

  const diasBloqueados = await prisma.diaBloqueado.findMany({
    where: { empleadoId: empleado.id, fecha: { gte: new Date() } },
    orderBy: { fecha: "asc" },
  });

  return NextResponse.json({ diasBloqueados });
}

export async function DELETE(req: NextRequest) {
  const { error, status, negocio } = await verificarApiKey(req);
  if (error) return NextResponse.json({ error }, { status });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "O id do dia bloqueado é obrigatório" }, { status: 400 });

  const diaBloqueado = await prisma.diaBloqueado.findUnique({
    where: { id: parseInt(id) },
    include: { empleado: true },
  });

  if (!diaBloqueado || diaBloqueado.empleado.negocioId !== negocio!.id) {
    return NextResponse.json({ error: "Dia bloqueado não encontrado" }, { status: 404 });
  }

  await prisma.diaBloqueado.delete({ where: { id: parseInt(id) } });

  return NextResponse.json({ mensaje: "Dia desbloqueado com sucesso" });
}
