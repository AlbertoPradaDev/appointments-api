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

  const servicios = await prisma.servicio.findMany({ where: { empleadoId: empleado.id } });

  return NextResponse.json({ servicios });
}

export async function POST(req: NextRequest) {
  const decoded = verificarToken(req);
  if (!decoded) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { nombre, duracion, precio, empleadoId } = await req.json();

  if (!nombre || !duracion || !empleadoId) {
    return NextResponse.json({ error: "Nome, duração e empleadoId são obrigatórios" }, { status: 400 });
  }

  const empleado = await prisma.empleado.findUnique({ where: { id: parseInt(empleadoId) } });

  if (!empleado || empleado.negocioId !== decoded.negocioId) {
    return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });
  }

  const servicio = await prisma.servicio.create({
    data: { nombre, duracion, precio: precio ?? null, empleadoId: empleado.id },
  });

  return NextResponse.json({ mensaje: "Serviço criado", servicio }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const decoded = verificarToken(req);
  if (!decoded) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Id obrigatório" }, { status: 400 });

  const servicio = await prisma.servicio.findUnique({
    where: { id: parseInt(id) },
    include: { empleado: true },
  });

  if (!servicio || servicio.empleado.negocioId !== decoded.negocioId) {
    return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
  }

  await prisma.servicio.delete({ where: { id: parseInt(id) } });

  return NextResponse.json({ mensaje: "Serviço eliminado" });
}
