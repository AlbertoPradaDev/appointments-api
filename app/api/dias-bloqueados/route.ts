import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { verificarApiKey } from "../../lib/auth";

export async function POST(req: NextRequest) {
  const { error, status, negocio } = await verificarApiKey(req);

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  const body = await req.json();
  const { fecha, motivo } = body;

  if (!fecha) {
    return NextResponse.json(
      { error: "A data é obrigatória" },
      { status: 400 }
    );
  }

  const fechaDate = new Date(fecha);

  if (isNaN(fechaDate.getTime())) {
    return NextResponse.json(
      { error: "Formato de data inválido. Use YYYY-MM-DD, exemplo: 2026-12-25" },
      { status: 400 }
    );
  }

  const diaExistente = await prisma.diaBloqueado.findFirst({
    where: {
      negocioId: negocio!.id,
      fecha: fechaDate,
    },
  });

  if (diaExistente) {
    return NextResponse.json(
      { error: "Esse dia já está bloqueado" },
      { status: 409 }
    );
  }

  const diaBloqueado = await prisma.diaBloqueado.create({
    data: {
      fecha: fechaDate,
      motivo: motivo ?? null,
      negocioId: negocio!.id,
    },
  });

  return NextResponse.json(
    { mensaje: "Dia bloqueado com sucesso", diaBloqueado },
    { status: 201 }
  );
}

export async function GET(req: NextRequest) {
  const { error, status, negocio } = await verificarApiKey(req);

  if (error) {
    return NextResponse.json({ error }, { status });
  }

  const hoy = new Date();

  const diasBloqueados = await prisma.diaBloqueado.findMany({
    where: {
      negocioId: negocio!.id,
      fecha: { gte: hoy },
    },
    orderBy: { fecha: "asc" },
  });

  return NextResponse.json({ diasBloqueados });
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
      { error: "O id do dia bloqueado é obrigatório" },
      { status: 400 }
    );
  }

  const diaBloqueado = await prisma.diaBloqueado.findUnique({
    where: { id: parseInt(id) },
  });

  if (!diaBloqueado || diaBloqueado.negocioId !== negocio!.id) {
    return NextResponse.json(
      { error: "Dia bloqueado não encontrado" },
      { status: 404 }
    );
  }

  await prisma.diaBloqueado.delete({
    where: { id: parseInt(id) },
  });

  return NextResponse.json({ mensaje: "Dia desbloqueado com sucesso" });
}