import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { verificarApiKey } from "../../lib/auth";

export async function POST(req: NextRequest) {
  const { error, status, negocio } = await verificarApiKey(req);
  if (error) return NextResponse.json({ error }, { status });

  const { nombre, email, telefono } = await req.json();

  if (!nombre) {
    return NextResponse.json({ error: "O nome é obrigatório" }, { status: 400 });
  }

  const empleado = await prisma.empleado.create({
    data: { nombre, email: email ?? null, telefono: telefono ?? null, negocioId: negocio!.id },
  });

  return NextResponse.json({ mensaje: "Funcionário criado com sucesso", empleado }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const { error, status, negocio } = await verificarApiKey(req);
  if (error) return NextResponse.json({ error }, { status });

  const empleados = await prisma.empleado.findMany({
    where: { negocioId: negocio!.id },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({ empleados });
}

export async function DELETE(req: NextRequest) {
  const { error, status, negocio } = await verificarApiKey(req);
  if (error) return NextResponse.json({ error }, { status });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "O id do funcionário é obrigatório" }, { status: 400 });

  const empleado = await prisma.empleado.findUnique({ where: { id: parseInt(id) } });

  if (!empleado || empleado.negocioId !== negocio!.id) {
    return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });
  }

  await prisma.empleado.delete({ where: { id: parseInt(id) } });

  return NextResponse.json({ mensaje: "Funcionário eliminado com sucesso" });
}
