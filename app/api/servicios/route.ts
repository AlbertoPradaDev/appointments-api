import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { verificarApiKey } from "../../lib/auth";

export async function POST(req: NextRequest) {
  const { error, status, negocio } = await verificarApiKey(req);

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  const body = await req.json();
  const { nombre, duracion, precio } = body;

  if (!nombre || !duracion) {
    return NextResponse.json(
      { error: "Nome e duração são obrigatórios" },
      { status: 400 }
    );
  }

  if (typeof duracion !== "number" || duracion <= 0) {
    return NextResponse.json(
      { error: "A duração deve ser um número positivo em minutos" },
      { status: 400 }
    );
  }

  const servicio = await prisma.servicio.create({
    data: {
      nombre,
      duracion,
      precio: precio ?? null,
      negocioId: negocio!.id,
    },
  });

  return NextResponse.json(
    { mensaje: "Serviço criado com sucesso", servicio },
    { status: 201 }
  );
}

export async function GET(req: NextRequest) {
  const { error, status, negocio } = await verificarApiKey(req);

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  const servicios = await prisma.servicio.findMany({
    where: { negocioId: negocio!.id },
  });

  return NextResponse.json({ servicios });
}

export async function DELETE(req: NextRequest) {
  const { error, status, negocio } = await verificarApiKey(req);

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "O id do serviço é obrigatório" },
      { status: 400 }
    );
  }

  const servicio = await prisma.servicio.findUnique({
    where: { id: parseInt(id) },
  });

  if (!servicio || servicio.negocioId !== negocio!.id) {
    return NextResponse.json(
      { error: "Serviço não encontrado" },
      { status: 404 }
    );
  }

  await prisma.servicio.delete({
    where: { id: parseInt(id) },
  });

  return NextResponse.json({ mensaje: "Serviço eliminado com sucesso" });
}