import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { verificarApiKey } from "../../lib/auth";

export async function POST(req: NextRequest) {
  const { error, status, negocio } = await verificarApiKey(req);
  if (error) return NextResponse.json({ error }, { status });

  const { nombre, duracion, precio, empleadoId } = await req.json();

  if (!nombre || !duracion || !empleadoId) {
    return NextResponse.json(
      { error: "Nome, duração e empleadoId são obrigatórios" },
      { status: 400 }
    );
  }

  if (typeof duracion !== "number" || duracion <= 0) {
    return NextResponse.json(
      { error: "A duração deve ser um número positivo em minutos" },
      { status: 400 }
    );
  }

  const empleado = await prisma.empleado.findUnique({ where: { id: parseInt(empleadoId) } });

  if (!empleado || empleado.negocioId !== negocio!.id) {
    return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });
  }

  const servicio = await prisma.servicio.create({
    data: { nombre, duracion, precio: precio ?? null, empleadoId: empleado.id },
  });

  return NextResponse.json({ mensaje: "Serviço criado com sucesso", servicio }, { status: 201 });
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

  const servicios = await prisma.servicio.findMany({
    where: { empleadoId: empleado.id },
  });

  return NextResponse.json({ servicios });
}

export async function DELETE(req: NextRequest) {
  const { error, status, negocio } = await verificarApiKey(req);
  if (error) return NextResponse.json({ error }, { status });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "O id do serviço é obrigatório" }, { status: 400 });

  const servicio = await prisma.servicio.findUnique({
    where: { id: parseInt(id) },
    include: { empleado: true },
  });

  if (!servicio || servicio.empleado.negocioId !== negocio!.id) {
    return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
  }

  await prisma.servicio.delete({ where: { id: parseInt(id) } });

  return NextResponse.json({ mensaje: "Serviço eliminado com sucesso" });
}
