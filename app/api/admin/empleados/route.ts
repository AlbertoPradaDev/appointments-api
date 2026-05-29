import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { verificarToken } from "../../../lib/admin-auth";

export async function POST(req: NextRequest) {
  const decoded = verificarToken(req);
  if (!decoded) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { nombre, email, telefono } = await req.json();

  if (!nombre) {
    return NextResponse.json({ error: "O nome é obrigatório" }, { status: 400 });
  }

  const empleado = await prisma.empleado.create({
    data: { nombre, email: email ?? null, telefono: telefono ?? null, negocioId: decoded.negocioId },
  });

  return NextResponse.json({ mensaje: "Funcionário criado", empleado }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const decoded = verificarToken(req);
  if (!decoded) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const empleados = await prisma.empleado.findMany({
    where: { negocioId: decoded.negocioId },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({ empleados });
}

export async function PATCH(req: NextRequest) {
  const decoded = verificarToken(req);
  if (!decoded) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Id obrigatório" }, { status: 400 });

  const empleado = await prisma.empleado.findUnique({ where: { id: parseInt(id) } });

  if (!empleado || empleado.negocioId !== decoded.negocioId) {
    return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });
  }

  const { nombre, email, telefono } = await req.json();

  if (!nombre) {
    return NextResponse.json({ error: "O nome é obrigatório" }, { status: 400 });
  }

  const empleadoActualizado = await prisma.empleado.update({
    where: { id: parseInt(id) },
    data: { nombre, email: email || null, telefono: telefono || null },
  });

  return NextResponse.json({ mensaje: "Funcionário atualizado", empleado: empleadoActualizado });
}

export async function DELETE(req: NextRequest) {
  const decoded = verificarToken(req);
  if (!decoded) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Id obrigatório" }, { status: 400 });

  const empleado = await prisma.empleado.findUnique({ where: { id: parseInt(id) } });

  if (!empleado || empleado.negocioId !== decoded.negocioId) {
    return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });
  }

  await prisma.empleado.delete({ where: { id: parseInt(id) } });

  return NextResponse.json({ mensaje: "Funcionário eliminado" });
}
